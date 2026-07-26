import { describe, expect, it } from 'vitest';
import type { CredentialStore } from '../lib/integrations/credentials';
import {
  SwiggyMcpClient,
  type McpSession,
  type SwiggyToolDefinition,
} from '../lib/integrations/swiggy/client';
import {
  SwiggyOAuthProvider,
  type StoredSwiggyOAuth,
} from '../lib/integrations/swiggy/oauth';

class MemoryStore implements CredentialStore<StoredSwiggyOAuth> {
  value?: StoredSwiggyOAuth;
  async load() { return this.value && structuredClone(this.value); }
  async save(value: StoredSwiggyOAuth) { this.value = structuredClone(value); }
  async clear() { this.value = undefined; }
}

function objectTool(
  name: string,
  properties: Record<string, object>,
  required: string[] = [],
): SwiggyToolDefinition {
  return { name, inputSchema: { type: 'object', properties, required } };
}

describe('SwiggyMcpClient', () => {
  it('uses the live cart schema and accepts observed unwrapped structured content', async () => {
    const oauth = new SwiggyOAuthProvider(
      new MemoryStore(),
      'http://localhost:3000/api/integrations/swiggy/callback',
    );
    await oauth.saveTokens({ access_token: 'test-token', token_type: 'Bearer', expires_in: 300 });
    const called: Array<{ name: string; args: Record<string, unknown> }> = [];
    const tools = [
      objectTool('get_addresses', {}),
      objectTool('update_food_cart', {
        restaurantId: { type: 'string' },
        addressId: { type: 'string' },
        restaurantName: { type: 'string' },
        cartItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              menu_item_id: { type: 'string' },
              quantity: { type: 'number' },
            },
            required: ['menu_item_id', 'quantity'],
          },
        },
      }, ['restaurantId', 'addressId', 'cartItems']),
    ];
    const session: McpSession = {
      listTools: async () => tools,
      callTool: async (name, args) => {
        called.push({ name, args });
        return {
          structuredContent: {
            addresses: [{ id: 'address-1', addressLine: 'private' }],
          },
        };
      },
      close: async () => undefined,
    };
    const client = new SwiggyMcpClient(oauth, async () => session);
    await expect(client.call('get_addresses', {})).resolves.toMatchObject({
      addresses: [{ id: 'address-1' }],
    });
    const args = await client.argumentsForCartMutation({
      restaurantId: 'restaurant-1',
      restaurantName: 'Real Cafe',
      addressId: 'address-1',
      items: [{ itemId: 'item-1', quantity: 1 }],
    });
    expect(args).toEqual({
      restaurantId: 'restaurant-1',
      restaurantName: 'Real Cafe',
      addressId: 'address-1',
      cartItems: [{ menu_item_id: 'item-1', quantity: 1 }],
    });
    expect(called).toHaveLength(1);
  });
});
