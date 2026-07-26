import { NextResponse } from 'next/server';
import { routineService } from '@/lib/routines/singleton';
import { RoutineError } from '@/lib/routines/errors';
import { errorResponse, readObject } from '../http';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    return NextResponse.json({ routine: routineService.get(context.params.id) });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const body = await readObject(request);
    if (typeof body.action !== 'string') {
      throw new RoutineError('INVALID_INPUT', 'A routine action is required.');
    }

    switch (body.action) {
      case 'COMPLETE': {
        if (body.response !== undefined && typeof body.response !== 'string') {
          throw new RoutineError('INVALID_INPUT', 'response must be a string.');
        }
        const routine = routineService.complete(context.params.id, body.response);
        return NextResponse.json({ routine });
      }
      case 'SNOOZE': {
        if (typeof body.minutes !== 'number') {
          throw new RoutineError('INVALID_INPUT', 'minutes must be a number.');
        }
        const routine = routineService.snooze(context.params.id, body.minutes);
        return NextResponse.json({ routine });
      }
      case 'NO_RESPONSE': {
        if (
          body.retryAfterMinutes !== undefined &&
          typeof body.retryAfterMinutes !== 'number'
        ) {
          throw new RoutineError('INVALID_INPUT', 'retryAfterMinutes must be a number.');
        }
        const routine = routineService.noResponse(
          context.params.id,
          body.retryAfterMinutes,
        );
        return NextResponse.json({ routine });
      }
      case 'CANCEL': {
        const routine = routineService.cancel(context.params.id);
        return NextResponse.json({ routine });
      }
      default:
        throw new RoutineError('INVALID_INPUT', 'Unsupported routine action.');
    }
  } catch (error) {
    return errorResponse(error);
  }
}
