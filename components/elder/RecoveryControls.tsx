'use client';

interface RecoveryControlsProps {
  onStop: () => void;
  onWait: () => void;
  onRepeat: () => void;
  disabled?: boolean;
}

export function RecoveryControls({
  onStop,
  onWait,
  onRepeat,
  disabled = false,
}: RecoveryControlsProps): JSX.Element {
  return (
    <div className="recovery" role="group" aria-label="Controls">
      <button
        type="button"
        className="recovery__btn"
        onClick={onStop}
        disabled={disabled}
        aria-label="Stop what we are doing"
      >
        Stop
      </button>
      <button
        type="button"
        className="recovery__btn"
        onClick={onWait}
        disabled={disabled}
        aria-label="Wait, give me a moment"
      >
        Wait
      </button>
      <button
        type="button"
        className="recovery__btn"
        onClick={onRepeat}
        disabled={disabled}
        aria-label="Say that again"
      >
        Say it again
      </button>
    </div>
  );
}

export default RecoveryControls;
