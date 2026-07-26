'use client';

export interface ReceiptLine {
  key: string;
  value: string;
}

interface CompletionReceiptProps {
  title: string;
  lines: ReceiptLine[];
  practiceRun?: boolean;
  onDone: () => void;
  onTalkAgain?: () => void;
}

export function CompletionReceipt({
  title,
  lines,
  practiceRun = false,
  onDone,
  onTalkAgain,
}: CompletionReceiptProps): JSX.Element {
  return (
    <section className="receipt" aria-labelledby="receipt-title">
      <div className="receipt__mark" aria-hidden="true">
        ✓
      </div>

      <h2 id="receipt-title" className="receipt__title">
        {title}
      </h2>

      {lines.length > 0 ? (
        <div className="card mt-4">
          {lines.map((line) => (
            <div key={line.key} className="summary-row">
              <span className="summary-row__key">{line.key}</span>
              <span className="summary-row__val">{line.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {practiceRun ? (
        <p className="practice mt-4">
          <span aria-hidden="true">◑</span> This is a practice run.
        </p>
      ) : null}

      <div className="mt-6">
        <button type="button" className="btn btn--primary" onClick={onDone}>
          Done
        </button>
        {onTalkAgain ? (
          <button type="button" className="btn btn--secondary" onClick={onTalkAgain}>
            Talk to Thuna
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default CompletionReceipt;
