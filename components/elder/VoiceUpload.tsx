'use client';

/**
 * Voice upload — an alternative to live recording.
 *
 * Audio goes through the SAME Saaras route the microphone uses, so nothing
 * about the engine, safety checks or confirmation gates is bypassed. Only the
 * capture step changes.
 *
 * This exists for two reasons: a demo can run without granting microphone
 * permission, and an elder who cannot record reliably still has a way in.
 */

import { useRef, useState } from 'react';

export interface SampleVoice {
  id: string;
  label: string;
  detail: string;
  src: string;
}

/** Pre-recorded phrases, spoken with the same Bulbul voice Thuna replies in. */
export const SAMPLE_VOICES: readonly SampleVoice[] = [
  {
    id: 'order',
    label: 'Order my usual dosa',
    detail: 'Restores the previous order',
    src: '/samples/order-usual-dosa.wav',
  },
  {
    id: 'remember',
    label: 'Remind me to call Sree',
    detail: 'Creates a promise to follow up',
    src: '/samples/remember-call-sree.wav',
  },
  {
    id: 'safety',
    label: 'Someone is asking for my OTP',
    detail: 'Thuna refuses and offers help',
    src: '/samples/safety-otp-request.wav',
  },
];

interface VoiceUploadProps {
  onAudio: (file: Blob, filename: string) => void | Promise<void>;
  busy?: boolean;
  disabled?: boolean;
}

export function VoiceUpload({ onAudio, busy, disabled }: VoiceUploadProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function send(file: Blob, filename: string, label: string): Promise<void> {
    setProblem(null);
    setPending(label);
    try {
      await onAudio(file, filename);
    } catch (error) {
      setProblem(
        error instanceof Error && error.message
          ? error.message
          : 'I could not use that recording. Please try another.',
      );
    } finally {
      setPending(null);
    }
  }

  async function playSample(sample: SampleVoice): Promise<void> {
    try {
      const response = await fetch(sample.src, { cache: 'no-store' });
      if (!response.ok) throw new Error('That sample voice is unavailable.');
      const blob = await response.blob();
      await send(blob, `${sample.id}.wav`, sample.label);
    } catch (error) {
      setProblem(
        error instanceof Error ? error.message : 'That sample voice is unavailable.',
      );
      setPending(null);
    }
  }

  const locked = Boolean(busy || disabled || pending);

  return (
    <section className="card mt-6" aria-labelledby="upload-title">
      <h2 id="upload-title" className="section-label">
        Or use a recording
      </h2>
      <p className="caption">
        You can send a voice file instead of speaking. Thuna listens to it the same way.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="visually-hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void send(file, file.name, file.name);
        }}
      />

      <div className="mt-4">
        <button
          type="button"
          className="btn btn--secondary"
          disabled={locked}
          onClick={() => inputRef.current?.click()}
        >
          Choose a voice file
        </button>
      </div>

      <h3 className="section-label mt-6">Sample voices</h3>
      <div>
        {SAMPLE_VOICES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            className="choice"
            disabled={locked}
            onClick={() => void playSample(sample)}
            aria-label={`Send sample voice: ${sample.label}`}
          >
            {sample.label}
            <span className="choice__detail">{sample.detail}</span>
          </button>
        ))}
      </div>

      <p className="caption mt-4" aria-live="polite">
        {pending ? `Listening to “${pending}”…` : null}
      </p>

      {problem ? (
        <div className="notice notice--attention mt-4" role="status">
          <span aria-hidden="true">◑</span>
          <span>{problem}</span>
        </div>
      ) : null}
    </section>
  );
}

export default VoiceUpload;
