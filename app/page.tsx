'use client';

/**
 * Thuna — elder-first mobile experience.
 *
 * This file is the only place that maps production contracts onto UI shapes.
 * Components under components/elder/ are presentational and never import from
 * lib/, so a backend rename lands here and nowhere else.
 *
 * Elder Mode never renders inspector/debug data. The Demo Inspector lives on a
 * separate, unlinked route (/inspector).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ElderShell, type ElderArea } from '../components/elder/ElderShell';
import { HomeScreen, type HomeContextItem } from '../components/elder/HomeScreen';
import { VoiceStatePanel, type VoiceUiState } from '../components/elder/VoiceStatePanel';
import { TalkButton, type TalkVisualState } from '../components/elder/TalkButton';
import { RecoveryControls } from '../components/elder/RecoveryControls';
import { TaskScreen, type TaskKindUi, type TaskSummaryRow } from '../components/elder/TaskScreen';
import { ConfirmationScreen, type ConfirmationDetail } from '../components/elder/ConfirmationScreen';
import { SafetyWarning, type RiskKind } from '../components/elder/SafetyWarning';
import { CompletionReceipt, type ReceiptLine } from '../components/elder/CompletionReceipt';
import { ErrorRecovery, type RecoverableError } from '../components/elder/ErrorRecovery';
import {
  CheckInScreen,
  type RoutineKindUi,
  type RoutineStateUi,
} from '../components/elder/CheckInScreen';
import {
  DailyBriefPanel,
  FamilyHandoff,
  LifeEventList,
  MemoryReview,
  PendingLoops,
  RememberThis,
  Section,
  type BriefItemUi,
  type CandidateFieldUi,
  type LifeEventUi,
  type MemoryItemUi,
  type PendingLoopUi,
} from '../components/elder/ContinuityScreens';

import { clientApi, type HomeSnapshot, type RoutineSummary } from '../lib/client-api';
import type { ContinuitySnapshot, InboxCandidate } from '../lib/continuity/types';

/* ------------------------------------------------------------------ */
/* Contract mapping                                                    */
/* ------------------------------------------------------------------ */

/** Production ScreenState.status → UI voice state. */
function voiceStateFromStatus(status: string | undefined, fallback: VoiceUiState): VoiceUiState {
  switch (status) {
    case 'awaiting_confirmation':
      return 'waiting_for_action';
    case 'done':
      return 'completed';
    case 'refused':
      return 'unsupported';
    case 'paused':
      return 'paused';
    case 'handedoff':
      return 'handoff';
    default:
      return fallback;
  }
}

function talkVisual(state: VoiceUiState): TalkVisualState {
  if (state === 'listening') return 'listening';
  if (state === 'understanding') return 'understanding';
  if (state === 'speaking') return 'speaking';
  if (
    state === 'mic_denied' ||
    state === 'stt_failure' ||
    state === 'network_failure' ||
    state === 'tts_failure'
  ) {
    return 'error';
  }
  return 'idle';
}

const CREDENTIAL_RE = /\b(otp|pin|cvv|card number|password)\b/i;

/**
 * Client-side risk pre-check. This mirrors — and never replaces — the
 * deterministic refusal already enforced in lib/router.ts before any model
 * call. Its only job is to put the calm safety screen in front of the elder
 * without a network round trip.
 */
function riskFromText(text: string): RiskKind | null {
  if (CREDENTIAL_RE.test(text)) return 'CREDENTIAL';
  if (/\b(anydesk|teamviewer|remote access|screen share)\b/i.test(text)) return 'REMOTE_ACCESS';
  if (/\b(don'?t tell|do not tell|keep (this |it )?secret|between us)\b/i.test(text)) return 'SECRECY';
  if (/\bqr code\b/i.test(text)) return 'UNKNOWN_QR';
  if (/\b(urgent|immediately|right now)\b/i.test(text) && /\b(transfer|send money|pay)\b/i.test(text)) {
    return 'URGENT_TRANSFER';
  }
  if (/https?:\/\//i.test(text)) return 'SUSPICIOUS_LINK';
  return null;
}

const FIELD_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  items: 'Order',
  address: 'Deliver to',
  recipient: 'Send to',
  amount: 'Amount',
  date: 'Date',
  time: 'Time',
  venue: 'Place',
  provider: 'Provider',
  dueDate: 'Due date',
  title: 'What',
  orderId: 'Order',
};

function humanFieldLabel(key: string): string {
  return (
    FIELD_LABELS[key] ??
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase())
  );
}

function describeValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map((entry) => describeValue(entry)).join(', ');
  const record = value as Record<string, unknown>;
  if (typeof record.name === 'string') {
    const includes = Array.isArray(record.includes) ? (record.includes as unknown[]) : [];
    const excludes = Array.isArray(record.excludes) ? (record.excludes as unknown[]) : [];
    let text = record.name;
    if (includes.length > 0) text += `, with ${includes.join(', ')}`;
    if (excludes.length > 0) text += `, no ${excludes.join(', no ')}`;
    return text;
  }
  return '—';
}

/** ScreenState.fields → elder-readable rows. Never renders raw JSON or ids. */
function summaryRows(fields: Record<string, unknown>, total?: number): TaskSummaryRow[] {
  const rows: TaskSummaryRow[] = Object.entries(fields)
    .filter(([key, value]) => value !== null && value !== undefined && value !== '' && key !== 'total')
    .map(([key, value]) => ({ key: humanFieldLabel(key), value: describeValue(value) }));
  if (typeof total === 'number') {
    rows.push({ key: 'Total', value: `Rs ${total}`, emphasis: true });
  }
  return rows;
}

const TASK_TITLES: Record<TaskKindUi, string> = {
  ORDER_FOOD: 'Order food',
  SEND_PAYMENT: 'Send a payment',
  PHONE_HELP: 'Phone help',
  TRACK_ORDER: 'Track an order',
  GENERAL_HELP: 'A quick question',
  UNSUPPORTED: 'I cannot do that one',
};

const TASK_KINDS: readonly TaskKindUi[] = [
  'ORDER_FOOD',
  'SEND_PAYMENT',
  'PHONE_HELP',
  'TRACK_ORDER',
  'GENERAL_HELP',
  'UNSUPPORTED',
];

function asTaskKind(value: string): TaskKindUi {
  return TASK_KINDS.includes(value as TaskKindUi) ? (value as TaskKindUi) : 'GENERAL_HELP';
}

function greetingFor(name: string): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name}`;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type Overlay =
  | { kind: 'none' }
  | { kind: 'confirm' }
  | { kind: 'safety'; risk: RiskKind }
  | { kind: 'handoff' };

export default function ThunaMobile(): JSX.Element {
  const [area, setArea] = useState<ElderArea>('home');
  const [home, setHome] = useState<HomeSnapshot | null>(null);
  const [continuity, setContinuity] = useState<ContinuitySnapshot | null>(null);
  const [candidate, setCandidate] = useState<InboxCandidate | null>(null);

  const [voice, setVoice] = useState<VoiceUiState>('idle');
  const [guidance, setGuidance] = useState('');
  const [transcript, setTranscript] = useState('');
  const [task, setTask] = useState<TaskKindUi | null>(null);
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState('idle');

  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
  const [error, setError] = useState<RecoverableError | null>(null);
  const [offline, setOffline] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState<BriefItemUi[] | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const snapshot = await clientApi.loadHome();
      if (!alive) return;
      setHome(snapshot);
      try {
        const nextContinuity = await clientApi.loadContinuity();
        if (alive) setContinuity(nextContinuity);
      } catch {
        /* continuity is additive; the rest of the app works without it */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    setOffline(typeof navigator !== 'undefined' && navigator.onLine === false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const refresh = useCallback(async () => {
    const [snapshot, nextContinuity] = await Promise.allSettled([
      clientApi.loadHome(),
      clientApi.loadContinuity(),
    ]);
    if (snapshot.status === 'fulfilled') setHome(snapshot.value);
    if (nextContinuity.status === 'fulfilled') setContinuity(nextContinuity.value);
  }, []);

  const runTurn = useCallback(
    async (text: string) => {
      const risk = riskFromText(text);
      if (risk) {
        // Safety pre-empts everything, before any model call.
        setOverlay({ kind: 'safety', risk });
        setVoice('idle');
        return;
      }
      setBusy(true);
      setVoice('understanding');
      setError(null);
      try {
        const turn = await clientApi.interpretDemoText(text);
        setTranscript(turn.transcript);
        setGuidance(turn.guidance);
        setTask(asTaskKind(turn.task));
        const screenStatus = turn.inspector.sessionState;
        setStatus(screenStatus);
        const entities = turn.inspector.entities as Record<string, unknown>;
        setFields(entities);
        const maybeTotal = entities.total;
        setTotal(typeof maybeTotal === 'number' ? maybeTotal : undefined);
        if (screenStatus === 'awaiting_confirmation') {
          setOverlay({ kind: 'confirm' });
          setVoice('waiting_for_action');
        } else {
          setVoice(voiceStateFromStatus(screenStatus, 'speaking'));
        }
      } catch {
        setError(offline ? 'network_offline' : 'network_interrupted');
        setVoice('network_failure');
      } finally {
        setBusy(false);
      }
    },
    [offline],
  );

  const onTalk = useCallback(async () => {
    if (voice === 'listening') {
      setVoice('understanding');
      try {
        const turn = await clientApi.finishMicrophoneTurn();
        setTranscript(turn.transcript);
        await runTurn(turn.transcript);
      } catch {
        setError('stt_failure');
        setVoice('stt_failure');
      }
      return;
    }
    setArea('talk');
    setVoice('requesting_permission');
    const granted = await clientApi.requestMicrophone();
    if (granted === 'granted') {
      setVoice('listening');
    } else {
      setError('mic_denied');
      setVoice('mic_denied');
    }
  }, [voice, runTurn]);

  /* At most three context items — Home must never crowd. */
  const contextItems = useMemo<HomeContextItem[]>(() => {
    const items: HomeContextItem[] = [];
    const due =
      home?.routines.find((routine) => routine.status === 'DUE' || routine.status === 'ACTIVE') ??
      home?.nextRoutine;
    if (due) {
      const isDue = due.status === 'DUE' || due.status === 'ACTIVE';
      items.push({
        id: due.id,
        slot: isDue ? 'due' : 'soon',
        label: isDue ? 'Due now' : 'Coming soon',
        title: due.title,
        detail: due.dueLabel,
      });
    }
    const event = continuity?.lifeEvents.find(
      (candidateEvent) =>
        candidateEvent.state === 'UPCOMING' ||
        candidateEvent.state === 'CONFIRMED' ||
        candidateEvent.state === 'DUE',
    );
    if (event) {
      const when = event.fields.find((field) => field.key === 'date')?.value;
      items.push({
        id: event.id,
        slot: 'soon',
        label: 'Coming soon',
        title: event.title,
        detail: when === null || when === undefined ? 'Saved' : String(when),
      });
    }
    const loop = continuity?.pendingLoops.find(
      (pending) =>
        pending.state === 'OPEN' || pending.state === 'SCHEDULED' || pending.state === 'DUE',
    );
    if (loop) {
      items.push({
        id: loop.id,
        slot: 'continue',
        label: 'Continue',
        title: loop.description,
        detail: loop.trigger.stated,
      });
    }
    return items.slice(0, 3);
  }, [home, continuity]);

  const contactName = home?.contacts[0]?.name ?? 'your family';

  const confirmDetails = useMemo<ConfirmationDetail[]>(
    () => summaryRows(fields).map((row) => ({ key: row.key, value: row.value })),
    [fields],
  );

  const receiptLines = useMemo<ReceiptLine[]>(
    () => summaryRows(fields, total).map((row) => ({ key: row.key, value: row.value })),
    [fields, total],
  );

  const memoryItems = useMemo<MemoryItemUi[]>(() => {
    if (!home) return [];
    const items: MemoryItemUi[] = [
      { id: 'lang', text: `I prefer ${home.language}`, visibility: 'Only you and Thuna' },
      {
        id: 'pace',
        text: home.pace === 'Slow' ? 'Speak slowly' : 'Speak at a normal pace',
        visibility: 'Only you and Thuna',
      },
    ];
    for (const contact of home.contacts) {
      items.push({
        id: `contact-${contact.id}`,
        text: `${contact.name} is ${contact.relation.toLowerCase()}`,
        visibility: contact.canNotify
          ? `${contact.name} can be told when you ask`
          : `${contact.name} is not told anything`,
      });
    }
    return items;
  }, [home]);

  async function confirmTask(): Promise<void> {
    setOverlay({ kind: 'none' });
    await runTurn('yes');
  }

  async function loadBrief(): Promise<void> {
    try {
      const result = await clientApi.loadDailyBrief();
      setBrief(
        result.items.map((item) => ({ id: item.id, title: item.title, detail: item.detail })),
      );
    } catch {
      setBrief([]);
    }
  }

  async function confirmCandidate(): Promise<void> {
    if (!candidate) return;
    setBusy(true);
    try {
      await clientApi.confirmContinuityCandidate(candidate.id);
      setCandidate(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function routineAction(
    routine: RoutineSummary,
    action: 'COMPLETE' | 'SNOOZE' | 'CANCEL',
  ): Promise<void> {
    await clientApi.updateRoutine(
      routine.id,
      action,
      action === 'COMPLETE' ? { response: 'Yes' } : {},
    );
    await refresh();
  }

  /* Takeovers own the whole screen — no nav, no competing actions. */
  if (overlay.kind === 'safety') {
    return (
      <SafetyWarning
        risk={overlay.risk}
        trustedPersonName={contactName}
        onUnderstand={() => setOverlay({ kind: 'none' })}
        onAskTrustedPerson={() => setOverlay({ kind: 'handoff' })}
        onStopTask={() => {
          setOverlay({ kind: 'none' });
          setTask(null);
          setVoice('idle');
          setArea('home');
        }}
      />
    );
  }

  if (overlay.kind === 'confirm') {
    return (
      <ConfirmationScreen
        title="Shall I place this order?"
        details={confirmDetails}
        totalLabel="Total"
        totalValue={typeof total === 'number' ? `Rs ${total}` : undefined}
        practiceRun
        expiryNote="I'll hold this for a few minutes."
        onConfirm={() => void confirmTask()}
        onChange={() => {
          setOverlay({ kind: 'none' });
          setVoice('idle');
        }}
        onCancel={() => {
          setOverlay({ kind: 'none' });
          setTask(null);
          setVoice('idle');
          setArea('home');
        }}
      />
    );
  }

  const activeTask = task !== null && status !== 'done';

  return (
    <ElderShell area={area} onNavigate={setArea} offline={offline}>
      {area === 'home' ? (
        <>
          <HomeScreen
            greeting={greetingFor(home?.elderName ?? 'Appa')}
            subtitle="What can I help you with?"
            talkState={talkVisual(voice)}
            onTalk={() => void onTalk()}
            items={contextItems}
            onItem={() => setArea('reminders')}
            familyHelpLabel={`Ask ${contactName} for help`}
            onFamilyHelp={() => setOverlay({ kind: 'handoff' })}
          />

          {brief ? (
            <div className="mt-6">
              <DailyBriefPanel items={brief} onDismiss={() => setBrief(null)} />
            </div>
          ) : (
            <div className="mt-6">
              <button type="button" className="btn btn--quiet" onClick={() => void loadBrief()}>
                Show me my day
              </button>
            </div>
          )}
        </>
      ) : null}

      {area === 'talk' ? (
        <>
          <div className="center">
            <TalkButton
              state={talkVisual(voice)}
              onPress={() => void onTalk()}
              label={voice === 'listening' ? 'Stop listening' : 'Talk to Thuna'}
            />
          </div>

          <VoiceStatePanel state={voice} transcript={transcript} guidance={guidance} />

          {error ? (
            <div className="mt-4">
              <ErrorRecovery
                error={error}
                actions={[
                  { id: 'retry', label: 'Try again', primary: true },
                  { id: 'type', label: 'Type instead' },
                  { id: 'stop', label: 'Stop' },
                ]}
                onAction={(id) => {
                  if (id === 'retry') void onTalk();
                  if (id === 'type') setError(null);
                  if (id === 'stop') {
                    setError(null);
                    setVoice('idle');
                    setArea('home');
                  }
                }}
              />
            </div>
          ) : null}

          {activeTask && task ? (
            <div className="mt-4">
              <TaskScreen
                kind={task}
                title={TASK_TITLES[task]}
                instruction={guidance}
                summary={summaryRows(fields, total)}
                practiceRun={task === 'ORDER_FOOD' || task === 'SEND_PAYMENT'}
              />
            </div>
          ) : null}

          {status === 'done' ? (
            <CompletionReceipt
              title="That's done."
              lines={receiptLines}
              practiceRun
              onDone={() => {
                setTask(null);
                setStatus('idle');
                setVoice('idle');
                setArea('home');
                void refresh();
              }}
            />
          ) : null}

          <div className="mt-6">
            <label className="section-label" htmlFor="typed-input">
              Or type instead
            </label>
            <input
              id="typed-input"
              className="field"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="Order my usual dosa"
            />
            <div className="mt-4">
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy || typed.trim().length === 0}
                onClick={() => {
                  const text = typed.trim();
                  setTyped('');
                  void runTurn(text);
                }}
              >
                Send
              </button>
            </div>
          </div>

          {activeTask ? (
            <RecoveryControls
              onStop={() => {
                setTask(null);
                setVoice('idle');
                setArea('home');
              }}
              onWait={() => setVoice('paused')}
              onRepeat={() => void runTurn('repeat slowly')}
            />
          ) : null}
        </>
      ) : null}

      {area === 'reminders' ? (
        <>
          <h1 className="greeting">Your reminders</h1>

          <Section label="Check-ins">
            {(home?.routines ?? []).length === 0 ? (
              <div className="card">
                <p className="body-text">Nothing scheduled yet.</p>
              </div>
            ) : (
              <ul className="stack">
                {(home?.routines ?? []).map((routine) => (
                  <li key={routine.id}>
                    <CheckInScreen
                      kind={routine.kind as RoutineKindUi}
                      state={routine.status as RoutineStateUi}
                      title={routine.title}
                      dueLabel={routine.dueLabel}
                      onComplete={() => void routineAction(routine, 'COMPLETE')}
                      onSnooze={() => void routineAction(routine, 'SNOOZE')}
                      onCancel={() => void routineAction(routine, 'CANCEL')}
                      onAskFamily={() => setOverlay({ kind: 'handoff' })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {candidate ? (
            <Section label="Is this right?">
              <RememberThis
                title={candidate.title}
                readback={candidate.readback}
                fields={candidate.fields.map(
                  (field): CandidateFieldUi => ({
                    key: field.key,
                    label: humanFieldLabel(field.key),
                    value: describeValue(field.value),
                  }),
                )}
                onCorrect={() => undefined}
                onConfirm={() => void confirmCandidate()}
                onDiscard={() => setCandidate(null)}
                busy={busy}
              />
            </Section>
          ) : null}

          <Section label="Coming up">
            <LifeEventList
              events={(continuity?.lifeEvents ?? []).map(
                (event): LifeEventUi => ({
                  id: event.id,
                  title: event.title,
                  detail: event.type.toLowerCase().replace(/_/g, ' '),
                  state: event.state,
                  when: String(event.fields.find((field) => field.key === 'date')?.value ?? 'Saved'),
                }),
              )}
            />
          </Section>

          <Section label="You asked me to remember">
            <PendingLoops
              loops={(continuity?.pendingLoops ?? []).map(
                (loop): PendingLoopUi => ({
                  id: loop.id,
                  description: loop.description,
                  stated: loop.trigger.stated,
                  state: loop.state,
                }),
              )}
              onComplete={(id) => {
                void clientApi
                  .updatePendingLoop(id, 'COMPLETE_LOOP', { response: 'Yes' })
                  .then(refresh);
              }}
              onSnooze={(id) => {
                void clientApi.updatePendingLoop(id, 'SNOOZE_LOOP').then(refresh);
              }}
              onRelease={(id) => {
                void clientApi.updatePendingLoop(id, 'CANCEL_LOOP').then(refresh);
              }}
            />
          </Section>

          <Section label="Your privacy">
            <MemoryReview items={memoryItems} />
          </Section>
        </>
      ) : null}

      {overlay.kind === 'handoff' ? (
        <div className="mt-6">
          <FamilyHandoff
            contactName={contactName}
            disclosure={`${home?.elderName ?? 'Appa'} needs help with something on the phone.`}
            busy={busy}
            onAsk={() => {
              setBusy(true);
              void clientApi.requestFamilyHelp().finally(() => {
                setBusy(false);
                setOverlay({ kind: 'none' });
              });
            }}
            onKeepPrivate={() => setOverlay({ kind: 'none' })}
          />
        </div>
      ) : null}
    </ElderShell>
  );
}
