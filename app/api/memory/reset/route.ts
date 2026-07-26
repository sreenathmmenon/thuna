import { memoryStore } from '@/lib/memory/default-store';
import { memoryErrorResponse } from '@/lib/memory/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  try {
    return Response.json({ memory: memoryStore.resetToDemoSeed() });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
