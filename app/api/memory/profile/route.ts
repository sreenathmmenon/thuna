import { memoryStore } from '@/lib/memory/default-store';
import {
  memoryErrorResponse,
  readJsonObject,
} from '@/lib/memory/http';
import type { ProfileUpdate } from '@/lib/memory/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    return Response.json({ profile: memoryStore.getProfile() });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const profile = memoryStore.updateProfile(body as ProfileUpdate);
    return Response.json({ profile });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function DELETE(): Promise<Response> {
  try {
    memoryStore.deleteProfileAndMemory();
    return new Response(null, { status: 204 });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
