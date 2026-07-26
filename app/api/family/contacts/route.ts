import { invalidInput } from '@/lib/memory/errors';
import { memoryStore } from '@/lib/memory/default-store';
import {
  memoryErrorResponse,
  readJsonObject,
} from '@/lib/memory/http';
import type { TrustedContactInput } from '@/lib/memory/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    return Response.json({ contacts: memoryStore.listTrustedContacts() });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    if ('notificationConsent' in body) {
      throw invalidInput(
        'Use the consent endpoint to change notification consent',
      );
    }
    const contact = memoryStore.createTrustedContact(
      body as unknown as TrustedContactInput,
    );
    return Response.json({ contact }, { status: 201 });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
