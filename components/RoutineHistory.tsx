import type { HistoryItem, RoutineSummary } from '../lib/client-api';

interface RoutineHistoryProps {
  routines: RoutineSummary[];
  history: HistoryItem[];
}

const statusLabels: Record<RoutineSummary['status'], string> = {
  SCHEDULED: 'Scheduled',
  DUE: 'Due now',
  ACTIVE: 'Checking in',
  SNOOZED: 'Snoozed',
  COMPLETED: 'Completed',
  MISSED: 'Missed',
  ESCALATED: 'Family requested',
  CANCELLED: 'Cancelled',
};

export function RoutineHistory({ routines, history }: RoutineHistoryProps) {
  return (
    <div className="history-stack">
      <section aria-labelledby="routine-list-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Coming up</p>
            <h2 id="routine-list-title">My routines</h2>
          </div>
          <span className="quiet-badge">{routines.length} active</span>
        </div>
        <div className="list-cards">
          {routines.map((routine) => (
            <article className="list-card" key={routine.id}>
              <span className="list-card__icon" aria-hidden="true">◷</span>
              <div>
                <h3>{routine.title}</h3>
                <p>{routine.detail}</p>
                <small>{routine.dueLabel}</small>
              </div>
              <span className={`status-pill status-pill--${routine.status.toLowerCase()}`}>
                {statusLabels[routine.status]}
              </span>
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="routine-history-title">
        <p className="eyebrow">Past check-ins</p>
        <h2 id="routine-history-title">Routine history</h2>
        <div className="list-cards">
          {history.filter((item) => item.icon === 'routine').map((item) => (
            <article className="list-card" key={item.id}>
              <span className="list-card__icon list-card__icon--done" aria-hidden="true">✓</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                <small>{item.time}</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

