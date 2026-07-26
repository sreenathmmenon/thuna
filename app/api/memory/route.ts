import { memoryStore } from '@/lib/memory/default-store';
import { memoryErrorResponse } from '@/lib/memory/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    return Response.json({ memory: memoryStore.getSnapshot() });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
