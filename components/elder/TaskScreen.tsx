'use client';

import type { ReactNode } from 'react';

export type TaskKindUi =
  | 'ORDER_FOOD'
  | 'SEND_PAYMENT'
  | 'PHONE_HELP'
  | 'TRACK_ORDER'
  | 'GENERAL_HELP'
  | 'UNSUPPORTED';

export interface TaskSummaryRow {
  key: string;
  value: string;
  emphasis?: boolean;
}

export interface TaskChoice {
  id: string;
  label: string;
  detail?: string;
}

interface TaskKindPresentation {
  glyph: string;
  label: string;
}

/**
 * The task kind is DATA, not layout. It only selects a heading glyph and a
 * short spoken-plain label. Every task kind renders through the exact same
 * slot order below.
 */
const TASK_KIND_PRESENTATION: Readonly<Record<TaskKindUi, TaskKindPresentation>> = {
  ORDER_FOOD: { glyph: '◍', label: 'Ordering food' },
  SEND_PAYMENT: { glyph: '◈', label: 'Sending money' },
  PHONE_HELP: { glyph: '◐', label: 'Help with your phone' },
  TRACK_ORDER: { glyph: '◔', label: 'Checking an order' },
  GENERAL_HELP: { glyph: '◇', label: 'Help' },
  UNSUPPORTED: { glyph: '◇', label: 'Help' },
};

interface TaskScreenProps {
  kind: TaskKindUi;
  title: string;
  instruction: string;
  choices?: TaskChoice[];
  onChoice?: (id: string) => void;
  summary?: TaskSummaryRow[];
  warning?: string;
  practiceRun?: boolean;
  children?: ReactNode;
}

export function TaskScreen({
  kind,
  title,
  instruction,
  choices,
  onChoice,
  summary,
  warning,
  practiceRun = false,
  children,
}: TaskScreenProps): JSX.Element {
  const presentation = TASK_KIND_PRESENTATION[kind];
  const hasChoices = Boolean(choices && choices.length > 0 && onChoice);
  const hasSummary = Boolean(summary && summary.length > 0);

  return (
    <section className="stack-lg" aria-labelledby="task-screen-title">
      <header className="stack">
        <p className="section-label">
          <span aria-hidden="true">{presentation.glyph}</span> {presentation.label}
        </p>
        <h2 id="task-screen-title" className="guidance-text">
          {title}
        </h2>
      </header>

      <p className="guidance-text">{instruction}</p>

      {hasChoices ? (
        <div className="stack">
          {choices?.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="choice"
              onClick={() => onChoice?.(choice.id)}
            >
              <span>{choice.label}</span>
              {choice.detail ? <span className="choice__detail">{choice.detail}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {hasSummary ? (
        <div className="card">
          {summary?.map((row) => (
            <div
              key={row.key}
              className={row.emphasis ? 'summary-row summary-row--total' : 'summary-row'}
            >
              <span className="summary-row__key">{row.key}</span>
              <span className="summary-row__val">{row.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {warning ? (
        <p className="notice notice--attention" role="status">
          {warning}
        </p>
      ) : null}

      {practiceRun ? (
        <p className="practice">
          <span aria-hidden="true">◑</span> This is a practice run.
        </p>
      ) : null}

      {children}
    </section>
  );
}

export default TaskScreen;
