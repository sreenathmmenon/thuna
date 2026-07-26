'use client';

export type RecoverableError =
  | 'mic_denied'
  | 'stt_failure'
  | 'tts_failure'
  | 'network_offline'
  | 'network_interrupted'
  | 'provider_unavailable'
  | 'ambiguous_result'
  | 'session_expired'
  | 'repeated_failure';

export interface RecoveryAction {
  id: string;
  label: string;
  primary?: boolean;
}

const ERROR_MESSAGE: Readonly<Record<RecoverableError, string>> = {
  mic_denied: "I can't use the microphone just now. We can carry on by typing.",
  stt_failure: 'I could not hear that clearly.',
  tts_failure: "I can't speak aloud right now, so I'll write everything down.",
  network_offline: "I can't reach the internet just now.",
  network_interrupted: 'The connection was interrupted.',
  provider_unavailable: "That service isn't answering at the moment.",
  ambiguous_result: 'Let me check whether that went through before we do anything else.',
  session_expired: "We were away for a while, so I've started fresh.",
  repeated_failure:
    "This isn't working, and I'm sorry — it is not you. Shall I ask someone to help?",
};

/**
 * While an outcome is unknown, retrying could repeat a real-world action
 * (a second payment, a second order). Any retry action is dropped.
 */
function isRetryAction(action: RecoveryAction): boolean {
  const haystack = `${action.id} ${action.label}`.toLowerCase();
  return (
    haystack.includes('retry') ||
    haystack.includes('try again') ||
    haystack.includes('again')
  );
}

interface ErrorRecoveryProps {
  error: RecoverableError;
  actions: RecoveryAction[];
  onAction: (id: string) => void;
}

export function ErrorRecovery({ error, actions, onAction }: ErrorRecoveryProps): JSX.Element {
  const isAmbiguous = error === 'ambiguous_result';
  const allowedActions = isAmbiguous ? actions.filter((a) => !isRetryAction(a)) : actions;

  // Primary actions first; order is otherwise preserved.
  const orderedActions = [
    ...allowedActions.filter((a) => a.primary === true),
    ...allowedActions.filter((a) => a.primary !== true),
  ];
  const hasDeclaredPrimary = allowedActions.some((a) => a.primary === true);

  return (
    <section className="card stack" role="status" aria-labelledby="error-recovery-message">
      <p id="error-recovery-message" className="guidance-text">
        {ERROR_MESSAGE[error]}
      </p>

      {isAmbiguous ? <p className="body-text">I&rsquo;ll tell you as soon as I know.</p> : null}

      {orderedActions.length > 0 ? (
        <div>
          {orderedActions.map((action, index) => {
            // Exactly one primary button: whichever action is declared primary,
            // or the first action when none is declared.
            const isPrimary = hasDeclaredPrimary ? action.primary === true : index === 0;
            return (
              <button
                key={action.id}
                type="button"
                className={isPrimary ? 'btn btn--primary' : 'btn btn--secondary'}
                onClick={() => onAction(action.id)}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export default ErrorRecovery;
