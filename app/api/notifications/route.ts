import { NextResponse } from 'next/server';
import { routineService } from '@/lib/routines/singleton';
import { RoutineError } from '@/lib/routines/errors';
import { errorResponse, readObject } from '../routines/http';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readObject(request);
    if (typeof body.routineId !== 'string' || !body.routineId.trim()) {
      throw new RoutineError('INVALID_INPUT', 'routineId is required.');
    }
    if (typeof body.explicitConsent !== 'boolean') {
      throw new RoutineError(
        'INVALID_INPUT',
        'explicitConsent must record the elder’s current choice.',
      );
    }

    const result = await routineService.requestFamily(
      body.routineId,
      body.explicitConsent,
    );
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
