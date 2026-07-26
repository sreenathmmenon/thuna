import { authoriseFamilyHandoff } from '@/lib/family';
import { invalidInput } from '@/lib/memory/errors';
import { memoryStore } from '@/lib/memory/default-store';
import {
  memoryErrorResponse,
  readJsonObject,
} from '@/lib/memory/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    if (typeof body.contactId !== 'string' || !body.contactId.trim()) {
      throw invalidInput('contactId must be a non-empty string');
    }
    if (body.elderExplicitlyRequested !== true) {
      throw invalidInput('elderExplicitlyRequested must be true');
    }
    if (typeof body.reason !== 'string' || !body.reason.trim()) {
      throw invalidInput('reason must be a non-empty string');
    }
    const handoff = authoriseFamilyHandoff(memoryStore, {
      contactId: body.contactId,
      elderExplicitlyRequested: true,
      reason: body.reason,
    });
    return Response.json({ handoff });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
