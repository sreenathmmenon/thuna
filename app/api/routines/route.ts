import { NextResponse } from 'next/server';
import { routineService } from '@/lib/routines/singleton';
import { ROUTINE_TYPES, type RoutineType } from '@/lib/routines/types';
import { RoutineError } from '@/lib/routines/errors';
import { errorResponse, readObject } from './http';

export const runtime = 'nodejs';

function isRoutineType(value: unknown): value is RoutineType {
  return typeof value === 'string' && ROUTINE_TYPES.some((type) => type === value);
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ routines: routineService.list() });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readObject(request);
    if (!isRoutineType(body.type)) {
      throw new RoutineError('INVALID_INPUT', 'A supported routine type is required.');
    }
    if (typeof body.scheduledFor !== 'string') {
      throw new RoutineError('INVALID_INPUT', 'scheduledFor must be an ISO date string.');
    }
    if (body.title !== undefined && typeof body.title !== 'string') {
      throw new RoutineError('INVALID_INPUT', 'title must be a string.');
    }

    const routine = routineService.create({
      type: body.type,
      scheduledFor: body.scheduledFor,
      title: body.title,
    });
    return NextResponse.json({ routine }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
