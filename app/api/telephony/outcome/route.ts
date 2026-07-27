import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { RoutineError } from '../../../../lib/routines/errors';
import { routineService } from '../../../../lib/routines/singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const outcomeSchema = z.discriminatedUnion('outcome', [
  z.object({
    routineId: z.string().uuid(),
    outcome: z.literal('completed'),
  }),
  z.object({
    routineId: z.string().uuid(),
    outcome: z.literal('snoozed'),
    snoozeMinutes: z.number().int().min(1).max(1440).default(10),
  }),
  z.object({
    routineId: z.string().uuid(),
    outcome: z.literal('family_help'),
  }),
  z.object({
    routineId: z.string().uuid(),
    outcome: z.literal('no_response'),
  }),
]);

function authorised(request: Request): boolean {
  const expected = process.env.THUNA_TELEPHONY_WEBHOOK_SECRET?.trim();
  const received = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || expected.length < 32 || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!authorised(request)) {
    return NextResponse.json({ error: { message: 'Unauthorised.' } }, { status: 401 });
  }
  try {
    const parsed = outcomeSchema.parse(await request.json());
    switch (parsed.outcome) {
      case 'completed':
        return NextResponse.json({
          routine: routineService.complete(parsed.routineId, 'completed'),
        });
      case 'snoozed':
        return NextResponse.json({
          routine: routineService.snooze(parsed.routineId, parsed.snoozeMinutes),
        });
      case 'family_help':
        return NextResponse.json(await routineService.requestFamily(parsed.routineId, true));
      case 'no_response':
        return NextResponse.json({ routine: routineService.noResponse(parsed.routineId) });
    }
  } catch (error) {
    const status = error instanceof RoutineError ? error.status : 400;
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof RoutineError
              ? error.message
              : 'The voice outcome was invalid or could not be applied.',
          recoverable: status < 500,
        },
      },
      { status },
    );
  }
}
