import fs from 'node:fs';
import { env } from './env';
import { SarvamError } from './voice/errors';
import {
  chatCompletionSchema,
  speechToTextResponseSchema,
  textToSpeechResponseSchema,
  translateResponseSchema,
} from './voice/schemas';

const BASE = 'https://api.sarvam.ai';
const DEFAULT_CHAT_MODEL = process.env.SARVAM_CHAT_MODEL || 'sarvam-30b';
export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
export const MAX_TTS_CHARACTERS = 2500;

type Fetcher = typeof fetch;

function key(): string {
  const value = process.env.SARVAM_API_KEY || env.sarvamKey;
  if (!value) {
    throw new SarvamError('MISSING_CREDENTIAL', 'Sarvam API key is not configured.', 503, true);
  }
  return value;
}

async function checkedJson(response: Response, operation: string): Promise<unknown> {
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new SarvamError(
      'UPSTREAM_ERROR',
      `${operation} failed with status ${response.status}${detail ? `: ${detail}` : ''}`,
      502,
      true,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new SarvamError('INVALID_UPSTREAM_RESPONSE', `${operation} returned invalid JSON.`, 502, true);
  }
}

export interface SpeechToTextResult {
  transcript: string;
  language_code: string | null;
}

/** Saaras v3 REST STT. The audio remains in memory and is never written to disk. */
export async function transcribeAudio(
  audio: Blob,
  filename = 'audio.webm',
  fetcher: Fetcher = fetch,
): Promise<SpeechToTextResult> {
  if (audio.size === 0) throw new SarvamError('EMPTY_AUDIO', 'The audio recording is empty.', 400, true);
  if (audio.size > MAX_AUDIO_BYTES) {
    throw new SarvamError('AUDIO_TOO_LARGE', `Audio must be ${MAX_AUDIO_BYTES} bytes or smaller.`, 413, true);
  }
  const form = new FormData();
  form.append('model', 'saaras:v3');
  form.append('mode', 'transcribe');
  form.append('file', audio, filename);
  const response = await fetcher(`${BASE}/speech-to-text`, {
    method: 'POST',
    headers: { 'api-subscription-key': key() },
    body: form,
  });
  const parsed = speechToTextResponseSchema.safeParse(await checkedJson(response, 'STT'));
  if (!parsed.success) {
    throw new SarvamError('INVALID_UPSTREAM_RESPONSE', 'STT response did not contain a transcript.', 502, true);
  }
  return { transcript: parsed.data.transcript, language_code: parsed.data.language_code ?? null };
}

/** Backwards-compatible file helper for existing scripts. Routes use transcribeAudio instead. */
export async function speechToText(audioPath: string): Promise<SpeechToTextResult> {
  const buffer = fs.readFileSync(audioPath);
  return transcribeAudio(new Blob([buffer]), audioPath.split('/').pop() || 'audio.wav');
}

export async function completeChat(
  systemPrompt: string,
  userPrompt: string,
  fetcher: Fetcher = fetch,
): Promise<string> {
  const response = await fetcher(`${BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'api-subscription-key': key(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: DEFAULT_CHAT_MODEL,
      temperature: 0,
      reasoning_effort: null,
      max_tokens: 512,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  const parsed = chatCompletionSchema.safeParse(await checkedJson(response, 'Interpretation'));
  if (!parsed.success) {
    throw new SarvamError('INVALID_UPSTREAM_RESPONSE', 'Interpretation response was malformed.', 502, true);
  }
  return parsed.data.choices[0].message.content;
}

export async function translate(input: string, source: string, target: string): Promise<string> {
  const response = await fetch(`${BASE}/translate`, {
    method: 'POST',
    headers: { 'api-subscription-key': key(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input,
      source_language_code: source || 'auto',
      target_language_code: target,
      speaker_gender: 'Male',
    }),
  });
  const parsed = translateResponseSchema.safeParse(await checkedJson(response, 'Translate'));
  if (!parsed.success) {
    throw new SarvamError('INVALID_UPSTREAM_RESPONSE', 'Translate response was malformed.', 502, true);
  }
  return parsed.data.translatedText;
}

export interface SynthesisResult {
  audio: Uint8Array;
  contentType: 'audio/wav';
}

/** Bulbul v3 REST TTS. Pace is deliberately limited to the two elder-facing modes. */
export async function synthesizeSpeech(
  text: string,
  options: { target?: string; speaker?: string; pace?: 'normal' | 'slow' } = {},
  fetcher: Fetcher = fetch,
): Promise<SynthesisResult> {
  const clean = text.trim();
  if (!clean) throw new SarvamError('EMPTY_TEXT', 'Speech text is required.', 400, true);
  if (clean.length > MAX_TTS_CHARACTERS) {
    throw new SarvamError('TEXT_TOO_LONG', `Speech text must be ${MAX_TTS_CHARACTERS} characters or fewer.`, 413, true);
  }
  const response = await fetcher(`${BASE}/text-to-speech`, {
    method: 'POST',
    headers: { 'api-subscription-key': key(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: clean,
      model: 'bulbul:v3',
      speaker: options.speaker || env.voice,
      target_language_code: options.target || env.targetLang,
      speech_sample_rate: 24000,
      pace: options.pace === 'slow' ? 0.8 : 1,
    }),
  });
  const parsed = textToSpeechResponseSchema.safeParse(await checkedJson(response, 'TTS'));
  if (!parsed.success || parsed.data.audios.length === 0) {
    throw new SarvamError('INVALID_UPSTREAM_RESPONSE', 'TTS response did not contain audio.', 502, true);
  }
  const chunks = parsed.data.audios.map((value: string) => Buffer.from(value, 'base64'));
  if (chunks.some((chunk: Buffer) => chunk.length === 0)) {
    throw new SarvamError('INVALID_UPSTREAM_RESPONSE', 'TTS returned invalid audio.', 502, true);
  }
  return { audio: Buffer.concat(chunks), contentType: 'audio/wav' };
}

/** Backwards-compatible helper for scripts that explicitly request a file output. */
export async function synthesize(text: string, target: string, speaker: string, outPath: string): Promise<void> {
  const result = await synthesizeSpeech(text, { target, speaker });
  fs.writeFileSync(outPath, result.audio);
}
