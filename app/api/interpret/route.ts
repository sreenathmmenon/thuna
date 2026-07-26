import type { ParsedCommand } from '../../../lib/types';
import { SarvamError, voiceError } from '../../../lib/voice/errors';
import { interpretTranscript } from '../../../lib/voice/interpret';
import { interpretationRequestSchema } from '../../../lib/voice/schemas';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const started = performance.now();
  try {
    const parsed = interpretationRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new SarvamError('INVALID_REQUEST', 'Interpretation input is invalid.', 400, true);
    }
    const input = parsed.data as {
      transcript: string;
      activeSession: Record<string, unknown>;
      currentTaskOrRoutine?: string | null;
      currentStep?: string | number | null;
      confirmedFields: Record<string, unknown>;
      screenContext: Record<string, unknown>;
      allowedActions: ParsedCommand['kind'][];
    };
    return Response.json(await interpretTranscript(input));
  } catch (error) {
    const failure = voiceError(error);
    return Response.json(
      { ...failure.error, latencyMs: Math.round(performance.now() - started), demoFallback: false },
      { status: failure.status },
    );
  }
}
