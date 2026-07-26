'use client';

interface GuidancePanelProps {
  guidance: string;
  transcript?: string;
  onRepeat: () => void;
  onWait: () => void;
  onBack: () => void;
  onStop: () => void;
  onRetry: () => void;
}

export function GuidancePanel({
  guidance,
  transcript,
  onRepeat,
  onWait,
  onBack,
  onStop,
  onRetry,
}: GuidancePanelProps) {
  return (
    <section className="guidance-panel" aria-labelledby="guidance-title">
      <div className="eyebrow">Thuna says</div>
      <h2 id="guidance-title">{guidance}</h2>
      {transcript ? (
        <p className="transcript">
          <span>You said</span>
          “{transcript}”
        </p>
      ) : null}
      <div className="control-grid" aria-label="Conversation controls">
        <button className="control-button" type="button" onClick={onRepeat}>
          <span aria-hidden="true">↻</span> Repeat slowly
        </button>
        <button className="control-button" type="button" onClick={onWait}>
          <span aria-hidden="true">Ⅱ</span> Wait
        </button>
        <button className="control-button" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Go back
        </button>
        <button className="control-button control-button--stop" type="button" onClick={onStop}>
          <span aria-hidden="true">■</span> Stop
        </button>
        <button className="control-button control-button--retry" type="button" onClick={onRetry}>
          <span aria-hidden="true">⟳</span> Retry
        </button>
      </div>
    </section>
  );
}

