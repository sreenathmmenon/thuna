'use client';

export type RiskKind =
  | 'CREDENTIAL'
  | 'WRONG_RECIPIENT'
  | 'SUSPICIOUS_LINK'
  | 'REMOTE_ACCESS'
  | 'UNKNOWN_QR'
  | 'URGENT_TRANSFER'
  | 'SECRECY';

const RISK_BODY: Readonly<Record<RiskKind, string>> = {
  CREDENTIAL:
    'Never share your OTP, PIN or CVV. A real bank will never ask you for them.',
  WRONG_RECIPIENT:
    'This name looks close to another one in your contacts. Let us check it together before any money moves.',
  SUSPICIOUS_LINK:
    'This link does not look safe to open. It is safer to leave it alone.',
  REMOTE_ACCESS:
    'This app would let someone else control your phone. Please do not install it.',
  UNKNOWN_QR:
    'This code is from someone you do not know. Scanning it could take money from your account.',
  URGENT_TRANSFER:
    'Someone is rushing you to send money. Real requests can always wait a few minutes.',
  SECRECY:
    'Someone has asked you to keep this from your family. That is a sign something is wrong. Nothing has gone wrong yet.',
};

/** Higher-severity risks get the danger surface; everything else stays calm. */
const DANGER_RISKS: readonly RiskKind[] = ['CREDENTIAL', 'REMOTE_ACCESS'];

interface SafetyWarningProps {
  risk: RiskKind;
  detail?: string;
  trustedPersonName?: string;
  onUnderstand: () => void;
  onAskTrustedPerson: () => void;
  onStopTask: () => void;
}

export function SafetyWarning({
  risk,
  detail,
  trustedPersonName = 'your trusted person',
  onUnderstand,
  onAskTrustedPerson,
  onStopTask,
}: SafetyWarningProps): JSX.Element {
  const isDanger = DANGER_RISKS.includes(risk);
  const className = isDanger ? 'takeover takeover--danger' : 'takeover takeover--safety';

  // For SECRECY the attacker has just told the elder not to reach out, so
  // reaching the trusted person becomes the primary action.
  const secrecy = risk === 'SECRECY';

  const understandButton = (
    <button
      type="button"
      className={secrecy ? 'btn btn--secondary' : 'btn btn--primary'}
      onClick={onUnderstand}
    >
      I understand
    </button>
  );

  const askButton = (
    <button
      type="button"
      className={secrecy ? 'btn btn--primary' : 'btn btn--secondary'}
      onClick={onAskTrustedPerson}
    >
      Ask {trustedPersonName}
    </button>
  );

  return (
    <div
      className={className}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="safety-warning-title"
      aria-describedby="safety-warning-body"
    >
      <h2 id="safety-warning-title" className="takeover__title">
        Please pause
      </h2>

      <p id="safety-warning-body" className="takeover__body">
        {RISK_BODY[risk]}
      </p>

      {detail ? (
        <div className="takeover__panel">
          <p className="body-text">{detail}</p>
        </div>
      ) : null}

      <div className="takeover__actions">
        {secrecy ? askButton : understandButton}
        {secrecy ? understandButton : askButton}
        <button type="button" className="btn btn--quiet" onClick={onStopTask}>
          Stop this task
        </button>
      </div>
    </div>
  );
}

export default SafetyWarning;
