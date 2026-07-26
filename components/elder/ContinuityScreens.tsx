'use client';

/**
 * Continuity screens — life events, "Remember this", daily brief, pending
 * promises, family handoff and memory review.
 *
 * Presentational only. All data arrives already mapped to UI shapes by
 * app/page.tsx via lib/client-api.ts, so production contract renames never
 * reach these components.
 */

import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Remember this — candidate confirmation                              */
/* ------------------------------------------------------------------ */

export interface CandidateFieldUi {
  key: string;
  label: string;
  value: string;
}

interface RememberThisProps {
  title: string;
  readback: string;
  fields: CandidateFieldUi[];
  onCorrect: (key: string) => void;
  onConfirm: () => void;
  onDiscard: () => void;
  busy?: boolean;
}

/**
 * A candidate is NOT saved until the elder confirms. Candidate-ness is carried
 * by several signals at once — dashed border, an explicit strip, and the absence
 * of any "saved" styling — because a single missed signal means an elder
 * believes something is stored when it is not.
 */
export function RememberThis({
  title,
  readback,
  fields,
  onCorrect,
  onConfirm,
  onDiscard,
  busy,
}: RememberThisProps): JSX.Element {
  return (
    <section className="candidate" aria-labelledby="candidate-title">
      <p className="candidate__strip">
        <span aria-hidden="true">◌</span> Not saved yet
      </p>
      <h2 id="candidate-title" className="guidance-text">
        {title}
      </h2>
      <p className="body-text mt-4">{readback}</p>

      <div className="mt-4">
        {fields.map((field) => (
          <div className="field-row" key={field.key}>
            <span>
              <span className="field-row__key">{field.label}</span>
              <br />
              <span className="field-row__val">{field.value}</span>
            </span>
            <button
              type="button"
              className="field-row__edit"
              onClick={() => onCorrect(field.key)}
              aria-label={`Change ${field.label}, currently ${field.value}`}
            >
              Change
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button type="button" className="btn btn--primary" onClick={onConfirm} disabled={busy}>
          Yes, remember this
        </button>
        <button type="button" className="btn btn--quiet" onClick={onDiscard} disabled={busy}>
          No, forget it
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Life event list                                                     */
/* ------------------------------------------------------------------ */

export interface LifeEventUi {
  id: string;
  title: string;
  detail: string;
  state: string;
  when: string;
}

interface LifeEventListProps {
  events: LifeEventUi[];
  onSelect?: (id: string) => void;
  emptyCopy?: string;
}

export function LifeEventList({ events, onSelect, emptyCopy }: LifeEventListProps): JSX.Element {
  if (events.length === 0) {
    return (
      <div className="card">
        <p className="body-text">{emptyCopy ?? 'Nothing is coming up yet.'}</p>
      </div>
    );
  }
  return (
    <ul className="stack">
      {events.map((event) => (
        <li key={event.id}>
          <button
            type="button"
            className="list-item"
            onClick={() => onSelect?.(event.id)}
            aria-label={`${event.title}, ${event.when}`}
          >
            <span className="list-item__title">{event.title}</span>
            <span className="list-item__meta">
              {event.when} · {event.detail}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Pending promises                                                    */
/* ------------------------------------------------------------------ */

export interface PendingLoopUi {
  id: string;
  description: string;
  stated: string;
  state: string;
}

interface PendingLoopsProps {
  loops: PendingLoopUi[];
  onComplete: (id: string) => void;
  onSnooze: (id: string) => void;
  onRelease: (id: string) => void;
}

export function PendingLoops({
  loops,
  onComplete,
  onSnooze,
  onRelease,
}: PendingLoopsProps): JSX.Element {
  if (loops.length === 0) {
    return (
      <div className="card">
        <p className="body-text">Nothing is waiting on you.</p>
      </div>
    );
  }
  return (
    <ul className="stack">
      {loops.map((loop) => (
        <li className="card" key={loop.id}>
          <p className="list-item__title">{loop.description}</p>
          <p className="list-item__meta">You said: {loop.stated}</p>
          <div className="mt-4">
            <button type="button" className="btn btn--primary" onClick={() => onComplete(loop.id)}>
              Done
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => onSnooze(loop.id)}>
              Remind me later
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => onRelease(loop.id)}>
              Let it go
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Daily brief                                                         */
/* ------------------------------------------------------------------ */

export interface BriefItemUi {
  id: string;
  title: string;
  detail: string;
}

interface DailyBriefProps {
  items: BriefItemUi[];
  omittedCount?: number;
  deferred?: boolean;
  onDismiss: () => void;
}

export function DailyBriefPanel({
  items,
  omittedCount = 0,
  deferred,
  onDismiss,
}: DailyBriefProps): JSX.Element {
  if (deferred) {
    return (
      <div className="notice notice--attention">
        <span aria-hidden="true">◔</span>
        <span>It is quiet hours, so I have kept today&rsquo;s summary for later.</span>
      </div>
    );
  }
  return (
    <section className="card" aria-labelledby="brief-title">
      <h2 id="brief-title" className="guidance-text">
        Here is your day
      </h2>
      <ul className="stack mt-4">
        {items.slice(0, 5).map((item) => (
          <li className="list-item" key={item.id}>
            <span className="list-item__title">{item.title}</span>
            <span className="list-item__meta">{item.detail}</span>
          </li>
        ))}
      </ul>
      {omittedCount > 0 ? (
        <p className="caption mt-4">And {omittedCount} more, whenever you want them.</p>
      ) : null}
      <div className="mt-6">
        <button type="button" className="btn btn--quiet" onClick={onDismiss}>
          Thank you
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Family handoff — show exactly what will be shared                   */
/* ------------------------------------------------------------------ */

interface FamilyHandoffProps {
  contactName: string;
  disclosure: string;
  onAsk: () => void;
  onKeepPrivate: () => void;
  busy?: boolean;
}

/**
 * Both buttons carry equal visual weight on purpose. A filled "Ask" against an
 * outlined "Keep private" would put a thumb on the scale, and declining help
 * must never read as the lesser choice.
 */
export function FamilyHandoff({
  contactName,
  disclosure,
  onAsk,
  onKeepPrivate,
  busy,
}: FamilyHandoffProps): JSX.Element {
  return (
    <section className="card" aria-labelledby="handoff-title">
      <h2 id="handoff-title" className="guidance-text">
        Ask {contactName} for help?
      </h2>
      <p className="body-text mt-4">I will tell {contactName}:</p>
      <blockquote className="notice mt-4">
        <span aria-hidden="true">“</span>
        <span>{disclosure}</span>
      </blockquote>
      <p className="caption mt-4">I will not share your full conversation.</p>
      <div className="mt-6">
        <button type="button" className="btn btn--secondary" onClick={onAsk} disabled={busy}>
          Ask {contactName}
        </button>
        <button type="button" className="btn btn--secondary" onClick={onKeepPrivate} disabled={busy}>
          Keep this private
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Memory review                                                       */
/* ------------------------------------------------------------------ */

export interface MemoryItemUi {
  id: string;
  text: string;
  visibility: string;
}

interface MemoryReviewProps {
  items: MemoryItemUi[];
  onRemove?: (id: string) => void;
}

/**
 * Plain language only — no categories, no confidence scores, no provenance
 * internals. Everything here must be readable aloud when the elder asks
 * "what do you remember about me?".
 */
export function MemoryReview({ items, onRemove }: MemoryReviewProps): JSX.Element {
  return (
    <section aria-labelledby="memory-title">
      <h2 id="memory-title" className="guidance-text">
        What Thuna remembers
      </h2>
      {items.length === 0 ? (
        <div className="card mt-4">
          <p className="body-text">Nothing yet. I only remember what you ask me to.</p>
        </div>
      ) : (
        <ul className="stack mt-4">
          {items.map((item) => (
            <li className="card" key={item.id}>
              <p className="list-item__title">{item.text}</p>
              <p className="list-item__meta">{item.visibility}</p>
              {onRemove ? (
                <div className="mt-4">
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Forget: ${item.text}`}
                  >
                    Forget this
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                     */
/* ------------------------------------------------------------------ */

export function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="mt-6">
      <h2 className="section-label">{label}</h2>
      {children}
    </section>
  );
}
