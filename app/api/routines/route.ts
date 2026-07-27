import { NextResponse } from 'next/server';
import { z } from 'zod';
import { routineService } from '@/lib/routines/singleton';
import { recurrenceSchema } from '@/lib/companion/reminder-planner';
import { ROUTINE_CHANNELS, ROUTINE_TYPES } from '@/lib/routines/types';
import { RoutineError } from '@/lib/routines/errors';
import { errorResponse, readObject } from './http';

export const runtime = 'nodejs';

const createRoutineSchema = z.object({
  type: z.enum(ROUTINE_TYPES),
  scheduledFor: z.string().datetime(),
  title: z.string().min(1).max(120).optional(),
  reminderText: z.string().min(1).max(500).optional(),
  timezone: z.string().min(1).max(80).optional(),
  recurrence: recurrenceSchema.optional(),
  channels: z.array(z.enum(ROUTINE_CHANNELS)).min(1).max(3).optional(),
  escalation: z
    .object({
      retryAfterMinutes: z.number().int().min(1).max(1440).optional(),
      maxRetries: z.number().int().min(0).max(5).optional(),
      notifyFamilyAfterMissed: z.boolean().optional(),
    })
    .optional(),
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ routines: routineService.list() });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readObject(request);
    const parsed = createRoutineSchema.safeParse(body);
    if (!parsed.success) {
      throw new RoutineError('INVALID_INPUT', 'Please check the reminder details.');
    }

    const routine = routineService.create(parsed.data);
    return NextResponse.json({ routine }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(): Promise<NextResponse> {
  routineService.reset();
  return NextResponse.json({ reset: true });
}
