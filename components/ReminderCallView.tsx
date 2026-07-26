'use client';

import type { RoutineStatus } from '../lib/client-api';

interface ReminderCallViewProps {
  status: RoutineStatus;
  countdown: number;
  onComplete: () => void;
  onSnooze: () => void;
  onCancel: () => void;
  onMissed: () => void;
  onFamily: () => void;
}

export function ReminderCallView({
  status,
  countdown,
  onComplete,
  onSnooze,
  onCancel,
  onMissed,
  onFamily,
}: ReminderCallViewProps) {
  if (status === 'SCHEDULED' || status === 'SNOOZED') {
    return (
      <section className="incoming-card incoming-card--waiting" aria-live="polite">
        <div className="pulse-ring" aria-hidden="true">◷</div>
        <p className="eyebrow">{status === 'SNOOZED' ? 'Snoozed once' : 'Demo timer running'}</p>
        <h2>{status === 'SNOOZED' ? 'I will check again shortly' : 'Next in-app check-in'}</h2>
        <strong className="countdown">{Math.max(0, countdown)} seconds</strong>
        <p>You can stay on this page. Thuna will open the check-in here.</p>
        <button className="secondary-button" type="button" onClick={onCancel}>Cancel reminder</button>
      </section>
    );
  }

  if (status === 'COMPLETED' || status === 'MISSED' || status === 'CANCELLED' || status === 'ESCALATED') {
    const copy: Record<string, { title: string; detail: string }> = {
      COMPLETED: { title: 'Routine completed', detail: 'You marked the reminder complete. This has been added to history.' },
      MISSED: { title: 'Check-in missed', detail: 'No response was counted as a miss, never as completion.' },
      CANCELLED: { title: 'Reminder cancelled', detail: 'No more check-ins will happen for this demo reminder.' },
      ESCALATED: { title: 'Family help requested', detail: 'Sree may be notified because you explicitly asked and consent is on.' },
    };
    return (
      <section className="receipt-card" aria-live="polite">
        <span className="receipt-card__check" aria-hidden="true">{status === 'COMPLETED' ? '✓' : '○'}</span>
        <p className="eyebrow">Medicine reminder</p>
        <h2>{copy[status].title}</h2>
        <p>{copy[status].detail}</p>
        <p className="disclaimer">Thuna only reminds. It does not advise dosage or change a medicine schedule.</p>
      </section>
    );
  }

  return (
    <section className="incoming-card" aria-labelledby="incoming-title">
      <div className="pulse-ring" aria-hidden="true">♪</div>
      <p className="eyebrow">In-app check-in</p>
      <h2 id="incoming-title">Good morning, Appa</h2>
      <p className="incoming-card__question">This is your medicine reminder. Would you like to mark it complete?</p>
      <button className="primary-button" type="button" onClick={onComplete}>Yes, mark complete</button>
      <button className="secondary-button" type="button" onClick={onSnooze}>Remind me later</button>
      <div className="inline-actions">
        <button className="text-button" type="button" onClick={onMissed}>I cannot respond now</button>
        <button className="text-button" type="button" onClick={onFamily}>Ask Sree for help</button>
        <button className="text-button text-button--danger" type="button" onClick={onCancel}>Cancel reminder</button>
      </div>
      <p className="disclaimer">Silence never marks a reminder complete.</p>
    </section>
  );
}

