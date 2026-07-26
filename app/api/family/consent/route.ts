import { invalidInput } from '@/lib/memory/errors';
import { memoryStore } from '@/lib/memory/default-store';
import {
  memoryErrorResponse,
  readJsonObject,
} from '@/lib/memory/http';
import type { ConsentChangeSource } from '@/lib/memory/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    return Response.json({ consentAudit: memoryStore.getConsentAudit() });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    if (typeof body.contactId !== 'string' || !body.contactId.trim()) {
      throw invalidInput('contactId must be a non-empty string');
    }
    if (typeof body.notificationConsent !== 'boolean') {
      throw invalidInput('notificationConsent must be boolean');
    }
    if (body.explicitElderConfirmation !== true) {
      throw invalidInput('explicitElderConfirmation must be true');
    }
    const source = body.source as ConsentChangeSource;
    const contact = memoryStore.setNotificationConsent(
      body.contactId,
      body.notificationConsent,
      true,
      source,
    );
    return Response.json({ contact });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
