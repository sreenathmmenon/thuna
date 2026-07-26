import { invalidInput } from '@/lib/memory/errors';
import { memoryStore } from '@/lib/memory/default-store';
import {
  memoryErrorResponse,
  readJsonObject,
} from '@/lib/memory/http';
import type { TrustedContactInput } from '@/lib/memory/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ContactContext {
  params: { contactId: string };
}

export async function GET(
  _request: Request,
  context: ContactContext,
): Promise<Response> {
  try {
    return Response.json({
      contact: memoryStore.getTrustedContact(context.params.contactId),
    });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: ContactContext,
): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    if ('notificationConsent' in body) {
      throw invalidInput(
        'Use the consent endpoint to change notification consent',
      );
    }
    const contact = memoryStore.updateTrustedContact(
      context.params.contactId,
      body as Partial<TrustedContactInput>,
    );
    return Response.json({ contact });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: ContactContext,
): Promise<Response> {
  try {
    memoryStore.deleteTrustedContact(context.params.contactId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
