import { memoryStore } from '../../../lib/memory/default-store';
import { quickCheck } from '../../../lib/router';
import {
  getOrCreate,
  getState,
  processInterpreted,
  reset,
  setPreference,
} from '../../../lib/session-store';
import type { ParsedCommand } from '../../../lib/types';
import { SarvamError, voiceError } from '../../../lib/voice/errors';
import { interpretTranscript, type InterpretationResult } from '../../../lib/voice/interpret';
import { sessionTurnRequestSchema } from '../../../lib/voice/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function seedSession(sessionId: string): void {
  const existing = getState(sessionId);
  if (existing?.ctx.preferences.usualOrder) return;
  const profile = memoryStore.getProfile();
  getOrCreate(sessionId);
  if (!profile) return;
  setPreference(sessionId, 'usualOrder', profile.previousFoodOrder
    ? {
        restaurant: profile.previousFoodOrder.restaurant,
        items: {
          name: profile.previousFoodOrder.item,
          includes: [...profile.previousFoodOrder.customisations],
          excludes: [],
        },
        address: profile.previousFoodOrder.address,
      }
    : undefined);
  setPreference(sessionId, 'language', profile.preferredLanguage);
  setPreference(sessionId, 'pace', profile.preferredPace);
}

function refusalCommand(reason: string): InterpretationResult {
  return {
    kind: 'refuse',
    reason,
    confidence: 1,
    latencyMs: 0,
    demoFallback: false,
  };
}

export async function POST(request: Request): Promise<Response> {
  const started = performance.now();
  try {
    const parsed = sessionTurnRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new SarvamError('INVALID_REQUEST', 'Session turn input is invalid.', 400, true);
    }
    const { sessionId, transcript } = parsed.data as {
      sessionId: string;
      transcript: string;
    };
    seedSession(sessionId);
    const before = getOrCreate(sessionId);
    const unsafe = quickCheck(transcript);
    const command = unsafe
      ? refusalCommand(unsafe.reason || 'sensitive credential')
      : await interpretTranscript({
          transcript,
          activeSession: { ctx: before.ctx },
          currentTaskOrRoutine: before.ctx.skillId,
          currentStep: before.ctx.stepIndex,
          confirmedFields: before.ctx.fields,
          screenContext: before.screen as unknown as Record<string, unknown>,
          allowedActions: [
            'start',
            'correction',
            'contextual_question',
            'confirmation',
            'recovery',
            'refuse',
            'unknown',
          ],
        });
    const result = processInterpreted(sessionId, transcript, command as ParsedCommand);
    const state = getOrCreate(sessionId);

    for (const event of result.events) {
      if (event.type === 'complete') {
        memoryStore.appendHistory('tasks', {
          summary: event.detail,
          metadata: { skillId: state.ctx.skillId, simulated: true },
        });
      } else if (event.type === 'correction') {
        memoryStore.appendHistory('corrections', {
          summary: `Updated fields: ${event.detail}`,
          metadata: { skillId: state.ctx.skillId },
        });
      } else if (event.type === 'handoff') {
        memoryStore.appendHistory('handoffs', {
          summary: 'Task paused for human help.',
          metadata: { skillId: state.ctx.skillId },
        });
      }
    }

    return Response.json({
      transcript,
      command,
      response: result.response,
      state,
      events: result.events,
      modelInvoked: !unsafe,
      latencyMs: Math.round(performance.now() - started),
    });
  } catch (error) {
    const failure = voiceError(error);
    return Response.json(
      { ...failure.error, latencyMs: Math.round(performance.now() - started) },
      { status: failure.status },
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  const sessionId = new URL(request.url).searchParams.get('sessionId');
  if (!sessionId) {
    return Response.json(
      { code: 'INVALID_REQUEST', message: 'sessionId is required.', recoverable: true },
      { status: 400 },
    );
  }
  seedSession(sessionId);
  return Response.json({ state: getOrCreate(sessionId) });
}

export async function DELETE(request: Request): Promise<Response> {
  const sessionId = new URL(request.url).searchParams.get('sessionId');
  if (!sessionId) {
    return Response.json(
      { code: 'INVALID_REQUEST', message: 'sessionId is required.', recoverable: true },
      { status: 400 },
    );
  }
  reset(sessionId);
  return Response.json({ reset: true });
}
