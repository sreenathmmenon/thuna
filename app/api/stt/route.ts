import { transcribeAudio } from '../../../lib/sarvam';
import { SarvamError, voiceError } from '../../../lib/voice/errors';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const started = performance.now();
  try {
    const form = await request.formData();
    const audio = form.get('audio') ?? form.get('file');
    if (!(audio instanceof Blob)) {
      throw new SarvamError('INVALID_REQUEST', 'FormData must include an audio file.', 400, true);
    }
    const filename = typeof File !== 'undefined' && audio instanceof File ? audio.name : 'recording.webm';
    const result = await transcribeAudio(audio, filename);
    return Response.json({
      transcript: result.transcript,
      languageCode: result.language_code,
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
