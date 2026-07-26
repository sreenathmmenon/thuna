import fs from 'node:fs';
import { env } from './env';

const BASE = 'https://api.sarvam.ai';
const KEY = env.sarvamKey;

// Saaras v3 STT — multipart/form-data, returns { transcript, language_code }
export async function speechToText(audioPath: string): Promise<{ transcript: string; language_code: string | null }> {
  const buf = fs.readFileSync(audioPath);
  const form = new FormData();
  form.append('model', 'saaras:v3');
  form.append('mode', 'transcribe');
  form.append('file', new Blob([buf]), 'audio.wav');
  const res = await fetch(`${BASE}/speech-to-text`, {
    method: 'POST',
  headers: { 'api-subscription-key': KEY },
  body: form,
  });
  if (!res.ok) throw new Error(`STT ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return { transcript: d.transcript as string, language_code: d.language_code ?? null };
}

// Sarvam-Translate — JSON, returns { translatedText }
export async function translate(input: string, source: string, target: string): Promise<string> {
  const res = await fetch(`${BASE}/translate`, {
  method: 'POST',
  headers: { 'api-subscription-key': KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ input, source_language_code: source || 'auto', target_language_code: target, speaker_gender: 'Male' }),
  });
  if (!res.ok) throw new Error(`Translate ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return d.translatedText as string;
}

// Bulbul v3 TTS — JSON, returns { audios: [base64 wav] } (<=2500 chars/req)
export async function synthesize(text: string, target: string, speaker: string, outPath: string): Promise<void> {
  const res = await fetch(`${BASE}/text-to-speech`, {
  method: 'POST',
  headers: { 'api-subscription-key': KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, model: 'bulbul:v3', speaker, target_language_code: target, speech_sample_rate: 24000 }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text()}`);
  const d = await res.json();
  const audio = Buffer.from((d.audios || []).join(''), 'base64');
  fs.writeFileSync(outPath, audio);
}
