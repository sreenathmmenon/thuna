interface SafetyPanelProps {
  onRequestFamily?: () => void;
}

export function SafetyPanel({ onRequestFamily }: SafetyPanelProps) {
  return (
    <section className="safety-panel" aria-labelledby="safety-title">
      <span className="safety-panel__icon" aria-hidden="true">◇</span>
      <div>
        <p className="eyebrow">Stopped safely</p>
        <h2 id="safety-title">Do not share an OTP, PIN or CVV</h2>
        <p>
          Thuna will never ask you for these numbers. I stopped the task before sending anything
          to an AI service.
        </p>
        {onRequestFamily ? (
          <button className="secondary-button" type="button" onClick={onRequestFamily}>
            Ask Sree for help
          </button>
        ) : null}
      </div>
    </section>
  );
}

