import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { synthesizeSpeech, transcribeAudio } from '../lib/sarvam';
import { SarvamError } from '../lib/voice/errors';
import { interpretTranscript, type InterpretationContext } from '../lib/voice/interpret';

const originalKey = process.env.SARVAM_API_KEY;

function interpretationInput(transcript: string): InterpretationContext {
  return {
    transcript,
    activeSession: {},
    confirmedFields: {},
    screenContext: {},
    allowedActions: [
      'start',
      'correction',
      'contextual_question',
      'confirmation',
      'recovery',
      'refuse',
      'unknown',
    ],
  };
}

describe('Saaras v3 STT', () => {
  beforeEach(() => {
    process.env.SARVAM_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.SARVAM_API_KEY;
    else process.env.SARVAM_API_KEY = originalKey;
  });

  it('transcribes an in-memory WAV fixture without retaining it', async () => {
    const fixture = new Blob([new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0])], { type: 'audio/wav' });
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe('POST');
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init?.body as FormData;
      expect(form.get('model')).toBe('saaras:v3');
      expect(form.get('mode')).toBe('transcribe');
      expect(form.get('file')).toBeInstanceOf(Blob);
      return Response.json({ transcript: 'Order my usual dosa', language_code: 'en-IN' });
    }) as unknown as typeof fetch;

    const result = await transcribeAudio(fixture, 'fixture.wav', fetcher);

    expect(result).toEqual({ transcript: 'Order my usual dosa', language_code: 'en-IN' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('returns a typed recoverable error for an upstream failure', async () => {
    const fetcher = vi.fn(async () => new Response('unavailable', { status: 503 })) as unknown as typeof fetch;
    await expect(transcribeAudio(new Blob(['audio']), 'clip.webm', fetcher))
      .rejects.toMatchObject({ code: 'UPSTREAM_ERROR', status: 502, recoverable: true });
  });
});

describe('structured Sarvam interpretation', () => {
  it('accepts a valid strict ParsedCommand response', async () => {
    const chat = vi.fn(async () => JSON.stringify({
      kind: 'correction',
      patch: { items: { name: 'Plain Dosa' } },
      confidence: 0.94,
    }));

    const result = await interpretTranscript({
      ...interpretationInput('Plain dosa, not masala dosa'),
      activeSession: {
        skillId: 'ORDER_FOOD',
        fields: { restaurant: 'Udupi Cafe' },
      },
    }, chat);

    expect(result.kind).toBe('correction');
    expect(result.patch).toEqual({ items: { name: 'Plain Dosa' } });
    expect(result.confidence).toBe(0.94);
    expect(result.demoFallback).toBe(false);
    expect(chat).toHaveBeenCalledOnce();
  });

  it('retries malformed JSON once and then falls back deterministically', async () => {
    const chat = vi.fn()
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce('{"kind":"not-a-command","confidence":2}');

    const result = await interpretTranscript(interpretationInput('Order my usual dosa'), chat);

    expect(chat).toHaveBeenCalledTimes(2);
    expect(result.kind).toBe('start');
    expect(result.skillId).toBe('ORDER_FOOD');
    expect(result.demoFallback).toBe(true);
  });

  it.each(['Can I tell you my OTP?', 'My PIN is 1234', 'The CVV is 321'])(
    'refuses %s before invoking the model',
    async transcript => {
      const chat = vi.fn(async () => {
        throw new Error('must not be called');
      });

      const result = await interpretTranscript(interpretationInput(transcript), chat);

      expect(result.kind).toBe('refuse');
      expect(result.confidence).toBe(1);
      expect(result.demoFallback).toBe(false);
      expect(chat).not.toHaveBeenCalled();
    },
  );
});

describe('Bulbul v3 TTS', () => {
  beforeEach(() => {
    process.env.SARVAM_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.SARVAM_API_KEY;
    else process.env.SARVAM_API_KEY = originalKey;
  });

  it('returns playable audio and sends slow pace', async () => {
    const encoded = Buffer.from('RIFF-test-wave').toString('base64');
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe('bulbul:v3');
      expect(body.pace).toBe(0.8);
      return Response.json({ audios: [encoded] });
    }) as unknown as typeof fetch;

    const result = await synthesizeSpeech('Please take your time.', { pace: 'slow' }, fetcher);

    expect(Buffer.from(result.audio).toString()).toBe('RIFF-test-wave');
    expect(result.contentType).toBe('audio/wav');
  });

  it('returns a typed failure when Bulbul is unavailable', async () => {
    const fetcher = vi.fn(async () => new Response('rate limited', { status: 429 })) as unknown as typeof fetch;

    await expect(synthesizeSpeech('Please try again.', {}, fetcher))
      .rejects.toEqual(expect.objectContaining({
        name: 'SarvamError',
        code: 'UPSTREAM_ERROR',
        status: 502,
        recoverable: true,
      } satisfies Partial<SarvamError>));
  });
});
