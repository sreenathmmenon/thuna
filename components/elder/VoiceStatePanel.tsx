'use client';

export type VoiceUiState =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'understanding'
  | 'speaking'
  | 'waiting_for_action'
  | 'paused'
  | 'interrupted'
  | 'reconnecting'
  | 'mic_denied'
  | 'stt_failure'
  | 'tts_failure'
  | 'network_failure'
  | 'unsupported'
  | 'handoff'
  | 'completed';

interface VoiceStatePanelProps {
  state: VoiceUiState;
  transcript?: string;
  guidance?: string;
  /** When provided and guidance exists, shows a “Say it again” action. */
  onReplay?: () => void;
  replayBusy?: boolean;
}

/** Short, plain state word shown above the copy. Never engine wording. */
const STATE_WORDS: Record<VoiceUiState, string> = {
  idle: 'Ready',
  requesting_permission: 'Microphone',
  listening: 'Listening',
  understanding: 'Thinking',
  speaking: 'Speaking',
  waiting_for_action: 'Your turn',
  paused: 'Paused',
  interrupted: 'Paused',
  reconnecting: 'Reconnecting',
  mic_denied: 'Microphone off',
  stt_failure: 'Didn’t catch that',
  tts_failure: 'Written only',
  network_failure: 'No connection',
  unsupported: 'Not something I can do',
  handoff: 'Family help',
  completed: 'Done',
};

/** Fixed elder-facing copy. States that show `guidance` are handled separately. */
const STATE_COPY: Record<Exclude<VoiceUiState, 'speaking' | 'waiting_for_action'>, string> = {
  idle: 'What would you like to do?',
  requesting_permission:
    'Your phone will ask if Thuna can use the microphone. Please choose Allow.',
  listening: 'Go ahead — I’m listening.',
  understanding: 'Let me see.',
  paused: 'Take your time. I’ll be here.',
  interrupted: 'We stopped partway. Shall we carry on?',
  reconnecting: 'I’ve lost the connection for a moment. I’m trying again.',
  mic_denied: 'I can’t use the microphone just now.',
  stt_failure: 'I couldn’t hear that clearly.',
  tts_failure: 'I can’t speak aloud right now, so I’ll write it.',
  network_failure: 'I can’t reach the internet just now.',
  unsupported: 'That one’s beyond me.',
  handoff: 'Shall I ask Sree to help with this?',
  completed: 'That’s done.',
};

function resolveCopy(state: VoiceUiState, guidance?: string): string {
  if (state === 'speaking' || state === 'waiting_for_action') {
    return guidance ?? '';
  }
  return STATE_COPY[state];
}

export function VoiceStatePanel({
  state,
  transcript,
  guidance,
  onReplay,
  replayBusy = false,
}: VoiceStatePanelProps): JSX.Element {
  const copy = resolveCopy(state, guidance);
  const showReplay = Boolean(onReplay && guidance && guidance.trim().length > 0);

  return (
    <section className="voice-panel">
      {/* One live region covering the state word AND the guidance itself, so
          screen readers announce what Thuna is actually saying — the guidance
          is the equal of the audio, never a subtitle to it. */}
      <div aria-live="polite">
        <p className="voice-panel__state">{STATE_WORDS[state]}</p>
        {copy ? <p className="voice-panel__copy">{copy}</p> : null}
      </div>

      {showReplay ? (
        <button
          type="button"
          className="replay"
          onClick={onReplay}
          disabled={replayBusy}
        >
          <span aria-hidden="true">↻</span> Say it again
        </button>
      ) : null}

      {transcript ? (
        <p className="transcript">
          <span className="transcript__label">You said</span>
          {transcript}
        </p>
      ) : null}
    </section>
  );
}

export default VoiceStatePanel;
