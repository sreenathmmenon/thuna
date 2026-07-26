import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import type { JsonSchemaType } from '@modelcontextprotocol/sdk/validation';
import { z } from 'zod';
import {
  SWIGGY_FOOD_MCP_URL,
  type SwiggyOAuthProvider,
} from './oauth';

export const SWIGGY_FOOD_TOOLS = [
  'get_addresses',
  'search_restaurants',
  'get_restaurant_menu',
  'search_menu',
  'update_food_cart',
  'get_food_cart',
  'place_food_order',
  'get_food_order_details',
  'get_food_orders',
  'track_food_order',
] as const;

export type SwiggyFoodToolName = (typeof SWIGGY_FOOD_TOOLS)[number];

const successEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  message: z.string().optional(),
}).passthrough();

const failureEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }).passthrough(),
  message: z.string().optional(),
}).passthrough();

export type SwiggyEnvelope =
  | z.infer<typeof successEnvelopeSchema>
  | z.infer<typeof failureEnvelopeSchema>;

export interface SwiggyToolDefinition {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, object>;
    required?: string[];
    [key: string]: unknown;
  };
  outputSchema?: {
    type: 'object';
    properties?: Record<string, object>;
    required?: string[];
    [key: string]: unknown;
  };
}

export interface SwiggyToolAudit {
  tool: SwiggyFoodToolName;
  status: 'ok' | 'provider_error' | 'transport_error' | 'malformed';
  durationMs: number;
  at: string;
}

export class SwiggyMcpError extends Error {
  constructor(
    readonly kind:
      | 'AUTH'
      | 'PROVIDER'
      | 'MALFORMED_RESPONSE'
      | 'NETWORK_AMBIGUITY'
      | 'TOOL_NOT_AVAILABLE'
      | 'INVALID_ARGUMENTS',
    message: string,
    readonly retryable = false,
  ) {
    super(message);
  }
}

export interface McpSession {
  listTools(): Promise<SwiggyToolDefinition[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  close(): Promise<void>;
}

export type McpSessionFactory = (
  accessToken: string,
  oauth: SwiggyOAuthProvider,
) => Promise<McpSession>;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAuthError(error: unknown): boolean {
  const message = errorText(error);
  const code = (error as { code?: number })?.code;
  return code === -32001 || /\b401\b|unauthori[sz]ed|token.?expired/i.test(message);
}

class OfficialMcpSession implements McpSession {
  private constructor(
    private readonly client: Client,
  ) {}

  static async connect(accessToken: string): Promise<OfficialMcpSession> {
    const client = new Client(
      { name: 'thuna-localhost-swiggy', version: '1.0.0' },
      {
        capabilities: {},
        jsonSchemaValidator: new AjvJsonSchemaValidator(),
      },
    );
    const transport = new StreamableHTTPClientTransport(
      new URL(SWIGGY_FOOD_MCP_URL),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        reconnectionOptions: {
          initialReconnectionDelay: 500,
          maxReconnectionDelay: 2_000,
          reconnectionDelayGrowFactor: 2,
          maxRetries: 0,
        },
      },
    );
    await client.connect(transport);
    return new OfficialMcpSession(client);
  }

  async listTools(): Promise<SwiggyToolDefinition[]> {
    const result = await this.client.listTools();
    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.client.callTool({ name, arguments: args });
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

const officialSessionFactory: McpSessionFactory = async (accessToken) =>
  OfficialMcpSession.connect(accessToken);

export class SwiggyMcpClient {
  private session?: McpSession;
  private tools?: Map<string, SwiggyToolDefinition>;
  private readonly validator = new AjvJsonSchemaValidator();
  private readonly audit: SwiggyToolAudit[] = [];

  constructor(
    private readonly oauth: SwiggyOAuthProvider,
    private readonly sessionFactory: McpSessionFactory = officialSessionFactory,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async connect(): Promise<void> {
    if (this.session) return;
    const accessToken = await this.oauth.accessToken();
    if (!accessToken) {
      throw new SwiggyMcpError('AUTH', 'Please reconnect Swiggy.');
    }
    try {
      this.session = await this.sessionFactory(accessToken, this.oauth);
      await this.loadTools();
    } catch (error) {
      if (isAuthError(error)) {
        await this.oauth.invalidateCredentials('tokens');
        throw new SwiggyMcpError('AUTH', 'Please reconnect Swiggy.');
      }
      throw new SwiggyMcpError(
        'NETWORK_AMBIGUITY',
        'Swiggy could not be reached safely.',
        false,
      );
    }
  }

  async close(): Promise<void> {
    const current = this.session;
    this.session = undefined;
    this.tools = undefined;
    if (current) await current.close();
  }

  async listTools(): Promise<SwiggyToolDefinition[]> {
    await this.connect();
    return [...(this.tools?.values() ?? [])].map((tool) => structuredClone(tool));
  }

  toolAudit(): SwiggyToolAudit[] {
    return this.audit.map((event) => ({ ...event }));
  }

  async call<T = unknown>(
    tool: SwiggyFoodToolName,
    args: Record<string, unknown>,
  ): Promise<T> {
    await this.connect();
    const definition = this.tools?.get(tool);
    if (!definition) {
      throw new SwiggyMcpError(
        'TOOL_NOT_AVAILABLE',
        `The connected Swiggy Food server did not advertise ${tool}.`,
      );
    }

    const validate = this.validator.getValidator<Record<string, unknown>>(
      definition.inputSchema as unknown as JsonSchemaType,
    );
    const validation = validate(args);
    if (!validation.valid) {
      throw new SwiggyMcpError(
        'INVALID_ARGUMENTS',
        `Arguments do not match the live ${tool} schema: ${validation.errorMessage}`,
      );
    }

    const started = Date.now();
    try {
      const result = await this.session!.callTool(tool, args);
      const envelope = extractSwiggyEnvelope(result);
      if (!envelope) {
        this.appendAudit(tool, 'malformed', started);
        throw new SwiggyMcpError(
          'MALFORMED_RESPONSE',
          `Swiggy returned a malformed ${tool} response.`,
        );
      }
      if (!envelope.success) {
        this.appendAudit(tool, 'provider_error', started);
        throw new SwiggyMcpError(
          'PROVIDER',
          envelope.error.message,
          false,
        );
      }
      this.appendAudit(tool, 'ok', started);
      return envelope.data as T;
    } catch (error) {
      if (error instanceof SwiggyMcpError) throw error;
      this.appendAudit(tool, 'transport_error', started);
      if (isAuthError(error)) {
        await this.oauth.invalidateCredentials('tokens');
        throw new SwiggyMcpError('AUTH', 'Please reconnect Swiggy.');
      }
      throw new SwiggyMcpError(
        'NETWORK_AMBIGUITY',
        `${tool} did not return a definite result. No automatic retry was attempted.`,
      );
    }
  }

  async argumentsForCartMutation(input: {
    restaurantId: string;
    restaurantName?: string;
    addressId: string;
    items: Record<string, unknown>[];
  }): Promise<Record<string, unknown>> {
    await this.connect();
    const definition = this.tools?.get('update_food_cart');
    if (!definition) {
      throw new SwiggyMcpError(
        'TOOL_NOT_AVAILABLE',
        'The connected Swiggy Food server did not advertise update_food_cart.',
      );
    }
    const properties = definition.inputSchema.properties ?? {};
    const itemKey = 'cartItems' in properties
      ? 'cartItems'
      : 'items' in properties
        ? 'items'
        : undefined;
    if (!itemKey) {
      throw new SwiggyMcpError(
        'INVALID_ARGUMENTS',
        'The live update_food_cart schema exposes neither cartItems nor items.',
      );
    }
    const itemSchema = (properties[itemKey] as {
      items?: { properties?: Record<string, object> };
    } | undefined)?.items;
    const itemProperties = itemSchema?.properties ?? {};
    const idKey = 'menu_item_id' in itemProperties
      ? 'menu_item_id'
      : 'itemId' in itemProperties
        ? 'itemId'
        : undefined;
    if (!idKey) {
      throw new SwiggyMcpError(
        'INVALID_ARGUMENTS',
        'The live update_food_cart item schema exposes no supported item identifier.',
      );
    }
    const items = input.items.map((item) => {
      const itemId = item.menu_item_id ?? item.itemId;
      if (typeof itemId !== 'string' || !itemId) {
        throw new SwiggyMcpError(
          'INVALID_ARGUMENTS',
          'A menu item identifier is required for the live cart schema.',
        );
      }
      const { itemId: _camelId, menu_item_id: _snakeId, ...rest } = item;
      return { ...rest, [idKey]: itemId };
    });
    return {
      restaurantId: input.restaurantId,
      addressId: input.addressId,
      ...(input.restaurantName && 'restaurantName' in properties
        ? { restaurantName: input.restaurantName }
        : {}),
      [itemKey]: items,
    };
  }

  private async loadTools(): Promise<void> {
    if (!this.session) throw new SwiggyMcpError('AUTH', 'Swiggy is not connected.');
    const listed = await this.session.listTools();
    this.tools = new Map(
      listed
        .filter((tool) => SWIGGY_FOOD_TOOLS.includes(tool.name as SwiggyFoodToolName))
        .map((tool) => [tool.name, tool]),
    );
  }

  private appendAudit(
    tool: SwiggyFoodToolName,
    status: SwiggyToolAudit['status'],
    started: number,
  ): void {
    this.audit.push({
      tool,
      status,
      durationMs: Math.max(0, Date.now() - started),
      at: this.now().toISOString(),
    });
  }
}

export function extractSwiggyEnvelope(result: unknown): SwiggyEnvelope | null {
  const structured = (result as { structuredContent?: unknown })?.structuredContent;
  const structuredParsed = successEnvelopeSchema.safeParse(structured);
  if (structuredParsed.success) return structuredParsed.data;
  const structuredFailure = failureEnvelopeSchema.safeParse(structured);
  if (structuredFailure.success) return structuredFailure.data;
  if (structured && typeof structured === 'object' && !Array.isArray(structured)) {
    // The live Food MCP currently exposes already-unwrapped tool data through
    // MCP structuredContent. The text block still carries the provider message.
    return { success: true, data: structured };
  }

  const content = (result as {
    content?: Array<{ type?: string; text?: string }>;
  })?.content;
  if (!Array.isArray(content)) return null;
  for (const block of content) {
    if (block.type !== 'text' || typeof block.text !== 'string') continue;
    try {
      const parsed: unknown = JSON.parse(block.text);
      const success = successEnvelopeSchema.safeParse(parsed);
      if (success.success) return success.data;
      const failure = failureEnvelopeSchema.safeParse(parsed);
      if (failure.success) return failure.data;
    } catch {
      // A non-JSON text block is not an official Swiggy tool envelope.
    }
  }
  return null;
}
