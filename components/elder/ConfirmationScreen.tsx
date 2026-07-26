'use client';

export interface ConfirmationDetail {
  key: string;
  value: string;
}

interface ConfirmationScreenProps {
  title: string;
  details: ConfirmationDetail[];
  totalLabel?: string;
  totalValue?: string;
  practiceRun?: boolean;
  expiryNote?: string;
  onConfirm: () => void;
  onChange: () => void;
  onCancel: () => void;
}

export function ConfirmationScreen({
  title,
  details,
  totalLabel,
  totalValue,
  practiceRun = false,
  expiryNote,
  onConfirm,
  onChange,
  onCancel,
}: ConfirmationScreenProps): JSX.Element {
  const showTotal = Boolean(totalLabel && totalValue);

  return (
    <div
      className="takeover takeover--confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
    >
      <h2 id="confirmation-title" className="takeover__title">
        {title}
      </h2>

      <div className="takeover__panel">
        {details.map((detail) => (
          <div key={detail.key} className="summary-row">
            <span className="summary-row__key">{detail.key}</span>
            <span className="summary-row__val">{detail.value}</span>
          </div>
        ))}

        {showTotal ? (
          <div className="summary-row summary-row--total">
            <span className="summary-row__key">{totalLabel}</span>
            <span className="summary-row__val takeover__total">{totalValue}</span>
          </div>
        ) : null}
      </div>

      {practiceRun ? (
        <p className="practice mt-4">
          <span aria-hidden="true">◑</span> This is a practice run.
        </p>
      ) : null}

      {expiryNote ? <p className="takeover__body">{expiryNote}</p> : null}

      <div className="takeover__actions">
        <button type="button" className="btn btn--primary" onClick={onConfirm}>
          Yes, continue
        </button>
        <button type="button" className="btn btn--secondary" onClick={onChange}>
          Change something
        </button>
        <button type="button" className="btn btn--quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ConfirmationScreen;
