import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  planReminder,
  ReminderPlanningError,
} from '../../../../lib/companion/reminder-planner';
import { RoutineError } from '../../../../lib/routines/errors';
import {
  consumeReminderProposal,
  createReminderProposal,
} from '../../../../lib/companion/proposals';
import { routineService } from '../../../../lib/routines/singleton';

export const runtime = 'nodejs';

const previewSchema = z.object({
  utterance: z.string().min(1).max(1000),
  timezone: z.string().min(1).max(80).optional(),
  language: z.string().min(1).max(80).optional(),
});

const confirmSchema = z.object({
  confirm: z.literal(true),
  proposalId: z.string().uuid(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const confirmation = confirmSchema.safeParse(body);
    if (confirmation.success) {
      const plan = consumeReminderProposal(confirmation.data.proposalId);
      return NextResponse.json(
        { plan, routine: routineService.create(plan), created: true },
        { status: 201 },
      );
    }
    const preview = previewSchema.parse(body);
    const plan = await planReminder(preview.utterance, preview);
    return NextResponse.json({
      proposalId: createReminderProposal(plan),
      plan,
      created: false,
    });
  } catch (error) {
    const message =
      error instanceof ReminderPlanningError || error instanceof RoutineError
        ? error.message
        : 'I could not plan that reminder just now. Please try again.';
    return NextResponse.json(
      {
        error: {
          message,
          recoverable: true,
        },
      },
      { status: 400 },
    );
  }
}
