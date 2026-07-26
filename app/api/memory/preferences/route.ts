import { memoryStore } from '@/lib/memory/default-store';
import {
  memoryErrorResponse,
  readJsonObject,
} from '@/lib/memory/http';
import type { PreferenceUpdate } from '@/lib/memory/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    return Response.json({ preferences: memoryStore.getPreferences() });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const profile = memoryStore.updatePreferences(body as PreferenceUpdate);
    return Response.json({
      preferences: {
        preferredLanguage: profile.preferredLanguage,
        preferredPace: profile.preferredPace,
        preferredAddress: profile.preferredAddress,
      },
    });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
