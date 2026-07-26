import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { synthesizeSpeech } from '../../../lib/sarvam';
import { SarvamError, voiceError } from '../../../lib/voice/errors';
import { ttsRequestSchema } from '../../../lib/voice/schemas';

export const runtime = 'nodejs';

const PREGENERATED_FALLBACKS: Record<string, string> = {
  order: 'order-usual.wav',
  safety: 'credential-refusal.wav',
  medicine: 'medicine-reminder.wav',
};

export async function POST(request: Request): Promise<Response> {
  const started = performance.now();
  let browserFallback: { text: string; pace: 'normal' | 'slow' } | undefined;
  let fallbackId: string | undefined;
  try {
    const parsed = ttsRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new SarvamError('INVALID_REQUEST', 'TTS input is invalid.', 400, true);
    }
    browserFallback = { text: parsed.data.text, pace: parsed.data.pace };
    fallbackId = parsed.data.fallbackId;
    const result = await synthesizeSpeech(parsed.data.text, {
      target: parsed.data.language,
      speaker: parsed.data.speaker,
      pace: parsed.data.pace,
    });
    const responseBody = Uint8Array.from(result.audio).buffer;
    return new Response(responseBody, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Length': String(result.audio.byteLength),
        'X-Thuna-Latency-Ms': String(Math.round(performance.now() - started)),
        'X-Thuna-Demo-Fallback': 'false',
      },
    });
  } catch (error) {
    const failure = voiceError(error);
    const fallbackFile = fallbackId ? PREGENERATED_FALLBACKS[fallbackId] : undefined;
    if (fallbackFile) {
      try {
        const audio = readFileSync(join(process.cwd(), 'public', 'audio', fallbackFile));
        return new Response(audio, {
          headers: {
            'Content-Type': 'audio/wav',
            'Content-Length': String(audio.byteLength),
            'X-Thuna-Latency-Ms': String(Math.round(performance.now() - started)),
            'X-Thuna-Demo-Fallback': 'pregenerated-bulbul',
          },
        });
      } catch {
        // Browser speech remains the last-resort response below.
      }
    }
    return Response.json(
      {
        ...failure.error,
        latencyMs: Math.round(performance.now() - started),
        demoFallback: true,
        fallback: browserFallback
          ? { type: 'browser_speech', ...browserFallback }
          : undefined,
      },
      { status: failure.status },
    );
  }
}
