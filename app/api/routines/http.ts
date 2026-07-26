import { NextResponse } from 'next/server';
import { RoutineError } from '@/lib/routines/errors';

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof RoutineError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, recoverable: error.status < 500 } },
      { status: error.status },
    );
  }
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'The routine request could not be completed.',
        recoverable: true,
      },
    },
    { status: 500 },
  );
}

export async function readObject(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new RoutineError('INVALID_INPUT', 'Request body must be valid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RoutineError('INVALID_INPUT', 'Request body must be a JSON object.');
  }
  return value as Record<string, unknown>;
}
