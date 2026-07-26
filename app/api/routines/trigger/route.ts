import { NextResponse } from 'next/server';
import { routineService } from '@/lib/routines/singleton';
import { RoutineError } from '@/lib/routines/errors';
import { errorResponse, readObject } from '../http';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readObject(request);
    let at: Date | undefined;
    if (body.at !== undefined) {
      if (typeof body.at !== 'string') {
        throw new RoutineError('INVALID_INPUT', 'at must be an ISO date string.');
      }
      at = new Date(body.at);
      if (!Number.isFinite(at.getTime())) {
        throw new RoutineError('INVALID_INPUT', 'at must be a valid ISO date string.');
      }
    }
    const triggered = await routineService.triggerDue(at);
    return NextResponse.json({ triggered });
  } catch (error) {
    return errorResponse(error);
  }
}
