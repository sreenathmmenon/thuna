'use client';

import type { VoicePhase } from '../lib/client-api';

interface VoiceButtonProps {
  phase: VoicePhase;
  onPress: () => void;
}

const labels: Record<VoicePhase, string> = {
  idle: 'Talk to Thuna',
  requesting_permission: 'Checking microphone…',
  listening: 'Listening… tap when done',
  understanding: 'Understanding…',
  speaking: 'Thuna is speaking',
  error: 'Try microphone again',
};

export function VoiceButton({ phase, onPress }: VoiceButtonProps) {
  const isBusy = phase === 'requesting_permission' || phase === 'understanding';

  return (
    <button
      className={`voice-button voice-button--${phase}`}
      type="button"
      onClick={onPress}
      disabled={isBusy}
      aria-label={labels[phase]}
      aria-live="polite"
    >
      <span className="voice-button__orb" aria-hidden="true">
        <span className="voice-button__icon">{phase === 'listening' ? '■' : '●'}</span>
      </span>
      <span>
        <strong>{labels[phase]}</strong>
        <small>{phase === 'idle' ? 'Press once, then speak' : 'I am here with you'}</small>
      </span>
    </button>
  );
}

