'use client';

export type TalkVisualState = 'idle' | 'listening' | 'understanding' | 'speaking' | 'error';

interface TalkButtonProps {
  state: TalkVisualState;
  onPress: () => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}

const GLYPHS: Record<TalkVisualState, string> = {
  idle: '◉',
  listening: '◉',
  understanding: '⋯',
  speaking: '♪',
  error: '!',
};

const MODIFIERS: Record<TalkVisualState, string> = {
  idle: '',
  listening: ' talk--listening',
  understanding: '',
  speaking: ' talk--speaking',
  error: ' talk--error',
};

/** Describes the ACTION the press performs, never the current state. */
const ACTIONS: Record<TalkVisualState, string> = {
  idle: 'Talk to Thuna',
  listening: 'Stop listening',
  understanding: 'Talk to Thuna',
  speaking: 'Stop Thuna speaking',
  error: 'Try talking to Thuna again',
};

export function TalkButton({
  state,
  onPress,
  disabled = false,
  label = 'Talk to Thuna',
  hint,
}: TalkButtonProps): JSX.Element {
  return (
    <div className="talk-wrap">
      <button
        type="button"
        className={`talk${MODIFIERS[state]}`}
        onClick={onPress}
        disabled={disabled}
        aria-label={ACTIONS[state]}
      >
        <span className="talk__glyph" aria-hidden="true">
          {GLYPHS[state]}
        </span>
      </button>
      <span className="talk__label">{label}</span>
      {hint ? <span className="talk__hint">{hint}</span> : null}
    </div>
  );
}

export default TalkButton;
