'use client';

export type RoutineKindUi =
  | 'MEDICINE_REMINDER'
  | 'WATER_REMINDER'
  | 'BILL_REMINDER'
  | 'FAMILY_CALL_REMINDER'
  | 'DELIVERY_FOLLOW_UP'
  | 'GENERAL_CHECK_IN';

export type RoutineStateUi =
  | 'SCHEDULED'
  | 'DUE'
  | 'ACTIVE'
  | 'SNOOZED'
  | 'COMPLETED'
  | 'MISSED'
  | 'ESCALATED'
  | 'CANCELLED';

/**
 * MEDICINE SAFETY: this component never receives and never renders dose,
 * strength, quantity or medicine identity. `title` is the elder's own words
 * for the routine (e.g. "morning tablets"). There is deliberately no
 * info/detail affordance — Thuna asks whether it was taken, never what to take.
 */
interface CheckInScreenProps {
  kind: RoutineKindUi;
  state: RoutineStateUi;
  title: string;
  dueLabel: string;
  onComplete?: () => void;
  onSnooze?: () => void;
  onCancel?: () => void;
  onAskFamily?: () => void;
}

function questionFor(kind: RoutineKindUi, title: string): string {
  switch (kind) {
    case 'MEDICINE_REMINDER':
      return `It's time for your ${title}. Have you taken it?`;
    case 'WATER_REMINDER':
      return 'Time for a glass of water. Have you had some?';
    case 'BILL_REMINDER':
      return `Your ${title} is due. Would you like a reminder again tomorrow?`;
    case 'FAMILY_CALL_REMINDER':
      return `You wanted to call about ${title}. Did you get through?`;
    case 'DELIVERY_FOLLOW_UP':
      return `Did your ${title} arrive?`;
    case 'GENERAL_CHECK_IN':
      return `Just checking in about ${title}.`;
  }
}

function messageFor(
  kind: RoutineKindUi,
  state: RoutineStateUi,
  title: string,
  dueLabel: string,
): string {
  switch (state) {
    case 'SCHEDULED':
      return `Next: ${title}, ${dueLabel}.`;
    case 'DUE':
    case 'ACTIVE':
      return questionFor(kind, title);
    case 'SNOOZED':
      return `I'll ask again at ${dueLabel}.`;
    case 'COMPLETED':
      return `Good. Noted at ${dueLabel}.`;
    case 'MISSED':
      return `I asked about ${title} at ${dueLabel} and didn't hear back. No trouble.`;
    case 'ESCALATED':
      return "I let your family know that two reminders went unanswered. That's all I told them.";
    case 'CANCELLED':
      return `I won't remind you about ${title} any more.`;
  }
}

export function CheckInScreen({
  kind,
  state,
  title,
  dueLabel,
  onComplete,
  onSnooze,
  onCancel,
  onAskFamily,
}: CheckInScreenProps): JSX.Element {
  const message = messageFor(kind, state, title, dueLabel);
  const isAsking = state === 'DUE' || state === 'ACTIVE';
  const isMissed = state === 'MISSED';

  return (
    <section className="card stack" aria-labelledby="check-in-message">
      <p id="check-in-message" className="guidance-text">
        {message}
      </p>

      {isAsking ? (
        <div>
          {onComplete ? (
            <button type="button" className="btn btn--primary" onClick={onComplete}>
              Yes, done
            </button>
          ) : null}
          {onSnooze ? (
            <button type="button" className="btn btn--secondary" onClick={onSnooze}>
              Remind me later
            </button>
          ) : null}
          {onCancel ? (
            <button type="button" className="btn btn--quiet" onClick={onCancel}>
              Not today
            </button>
          ) : null}
        </div>
      ) : null}

      {isMissed ? (
        <div>
          {onComplete ? (
            <button type="button" className="btn btn--primary" onClick={onComplete}>
              Mark as done
            </button>
          ) : null}
          {onAskFamily ? (
            <button type="button" className="btn btn--secondary" onClick={onAskFamily}>
              Ask family for help
            </button>
          ) : null}
        </div>
      ) : null}

      {!isAsking && !isMissed && onCancel ? (
        <div>
          <button type="button" className="btn btn--quiet" onClick={onCancel}>
            Dismiss
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default CheckInScreen;
