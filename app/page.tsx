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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Disclosure } from '../components/elder/Disclosure';
import { ElderShell, type ElderArea } from '../components/elder/ElderShell';
import { TextSizeControl, type TextSizeStep } from '../components/elder/TextSizeControl';
import { DeviceAlerts, showDeviceReminder } from '../components/elder/DeviceAlerts';
import { HomeScreen, type HomeContextItem } from '../components/elder/HomeScreen';
import { VoiceStatePanel, type VoiceUiState } from '../components/elder/VoiceStatePanel';
import { TalkButton, type TalkVisualState } from '../components/elder/TalkButton';
import { RecoveryControls } from '../components/elder/RecoveryControls';
import { VoiceUpload } from '../components/elder/VoiceUpload';
import { TaskScreen, type TaskKindUi, type TaskSummaryRow } from '../components/elder/TaskScreen';
import { ConfirmationScreen, type ConfirmationDetail } from '../components/elder/ConfirmationScreen';
import { SafetyWarning, type RiskKind } from '../components/elder/SafetyWarning';
import { CompletionReceipt, type ReceiptLine } from '../components/elder/CompletionReceipt';
import { ErrorRecovery, type RecoverableError } from '../components/elder/ErrorRecovery';
import {
  SwiggyFoodOrderView,
  type SwiggyProviderStatus,
} from '../components/SwiggyFoodOrderView';
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

import {
  clientApi,
  type HomeSnapshot,
  type RoutineSummary,
  type VoiceTurn,
} from '../lib/client-api';
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

/**
 * A short, gentle vibration for elders who miss the audio cue. Purely
 * additive — every state change it accompanies is also shown on screen.
 */
function buzz(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    /* haptics are best-effort */
  }
}

const TEXT_SIZE_KEY = 'thuna-text-size';

function loadTextSize(): TextSizeStep {
  try {
    const stored = window.localStorage.getItem(TEXT_SIZE_KEY);
    return stored === 'large' || stored === 'xl' ? stored : 'normal';
  } catch {
    return 'normal';
  }
}

function applyTextSize(step: TextSizeStep): void {
  try {
    if (step === 'normal') {
      delete document.documentElement.dataset.text;
      window.localStorage.removeItem(TEXT_SIZE_KEY);
    } else {
      document.documentElement.dataset.text = step;
      window.localStorage.setItem(TEXT_SIZE_KEY, step);
    }
  } catch {
    /* persistence is best-effort; the in-session size still applies */
  }
}

/**
 * First-visit examples for the Talk screen. Elders often don't know what they
 * may say to a voice product; each chip is a real, working utterance that
 * routes deterministically (see lib/command-parser routeByText).
 */
const STARTER_PHRASES: readonly string[] = [
  'Order my usual dosa',
  'Help me make the letters bigger on my phone',
  'Where is my order?',
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

interface PlannedReminder {
  proposalId: string;
  plan: {
    type: RoutineKindUi;
    title: string;
    reminderText: string;
    scheduledFor: string;
    timezone: string;
    recurrence: { frequency: string };
    readback: string;
  };
}

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
  const [foodProviderStatus, setFoodProviderStatus] =
    useState<SwiggyProviderStatus | null>(null);
  const [textSize, setTextSize] = useState<TextSizeStep>('normal');
  const [replaying, setReplaying] = useState(false);
  const [moreWaysOpen, setMoreWaysOpen] = useState(false);
  const [reminderRequest, setReminderRequest] = useState('');
  const [plannedReminder, setPlannedReminder] = useState<PlannedReminder | null>(null);
  const [reminderError, setReminderError] = useState('');
  const notifiedRoutines = useRef(new Set<string>());

  useEffect(() => {
    setTextSize(loadTextSize());
    const requestedArea = new URLSearchParams(window.location.search).get('area');
    if (requestedArea === 'reminders') setArea('reminders');
  }, []);

  const onTextSize = useCallback((step: TextSizeStep) => {
    setTextSize(step);
    applyTextSize(step);
  }, []);

  const onReplay = useCallback(async () => {
    setReplaying(true);
    try {
      await clientApi.replayGuidance();
    } finally {
      setReplaying(false);
    }
  }, []);

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
    let alive = true;
    void fetch('/api/integrations/swiggy', { cache: 'no-store' })
      .then((response) => response.json() as Promise<SwiggyProviderStatus>)
      .then((providerStatus) => {
        if (!alive) return;
        setFoodProviderStatus(providerStatus);
        if (providerStatus.mode === 'swiggy') {
          setOverlay((current) => current.kind === 'confirm' ? { kind: 'none' } : current);
        }
      })
      .catch(() => {
        if (alive) setFoodProviderStatus(null);
      });
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

  useEffect(() => {
    const run = () => {
      if (document.visibilityState !== 'visible') return;
      void clientApi.triggerDueRoutines().finally(refresh);
    };
    run();
    const interval = window.setInterval(run, 15_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const active = home?.routines.find(
      (routine) => routine.status === 'DUE' || routine.status === 'ACTIVE',
    );
    if (!active || notifiedRoutines.current.has(active.id)) return;
    notifiedRoutines.current.add(active.id);
    void showDeviceReminder({
      routineId: active.id,
      title: active.title,
      body: active.detail,
    });
  }, [home]);

  const applyTurn = useCallback((turn: VoiceTurn) => {
    const providerOwnsConfirmation =
      turn.task === 'ORDER_FOOD' && foodProviderStatus?.mode === 'swiggy';
    setTranscript(turn.transcript);
    setGuidance(
      providerOwnsConfirmation
        ? 'Let’s use your connected Swiggy account to find the food and check the real cart.'
        : turn.guidance,
    );
    setTask(asTaskKind(turn.task));
    const screenStatus = turn.inspector.sessionState;
    setStatus(screenStatus);
    const entities = turn.inspector.entities as Record<string, unknown>;
    setFields(entities);
    const maybeTotal = entities.total;
    setTotal(typeof maybeTotal === 'number' ? maybeTotal : undefined);
    if (screenStatus === 'awaiting_confirmation' && !providerOwnsConfirmation) {
      setOverlay({ kind: 'confirm' });
      setVoice('waiting_for_action');
      buzz([12, 60, 12]); // “your turn” — two gentle taps
    } else {
      setOverlay({ kind: 'none' });
      setVoice(voiceStateFromStatus(screenStatus, 'speaking'));
      if (screenStatus === 'done') buzz(20);
    }
  }, [foodProviderStatus?.mode]);

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
        applyTurn(turn);
      } catch {
        setError(offline ? 'network_offline' : 'network_interrupted');
        setVoice('network_failure');
      } finally {
        setBusy(false);
      }
    },
    [applyTurn, offline],
  );

  const onTalk = useCallback(async () => {
    if (voice === 'listening') {
      setVoice('understanding');
      try {
        const turn = await clientApi.finishMicrophoneTurn();
        applyTurn(turn);
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
      buzz(15);
    } else {
      setError('mic_denied');
      setVoice('mic_denied');
      // The elder still needs a way through: surface typing without a hunt.
      setMoreWaysOpen(true);
    }
  }, [applyTurn, voice]);

  const onDemoVoice = useCallback(async () => {
    setBusy(true);
    setError(null);
    setVoice('understanding');
    try {
      applyTurn(await clientApi.runPrerecordedVoiceTurn());
    } catch {
      setError('stt_failure');
      setVoice('stt_failure');
    } finally {
      setBusy(false);
    }
  }, [applyTurn]);

  /**
   * Uploaded audio takes exactly the same path as the microphone: Saaras
   * transcription, then the deterministic engine. Only capture changes.
   */
  const onUploadedAudio = useCallback(
    async (file: Blob, filename: string) => {
      setBusy(true);
      setError(null);
      setVoice('understanding');
      try {
        applyTurn(await clientApi.uploadAudioTurn(file, filename));
      } catch (uploadError) {
        setError('stt_failure');
        setVoice('stt_failure');
        throw uploadError;
      } finally {
        setBusy(false);
      }
    },
    [applyTurn],
  );

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
    try {
      await clientApi.updateRoutine(
        routine.id,
        action,
        action === 'COMPLETE'
          ? { response: 'Yes' }
          : action === 'SNOOZE'
            ? { minutes: 10 } // “a little more time”, elder-scaled
            : {},
      );
    } finally {
      // Whatever happened server-side, the screen must show the true state.
      await refresh();
    }
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
          <DeviceAlerts />
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

          <div className="mt-6">
            <p className="section-label" id="text-size-label">
              Text size
            </p>
            <TextSizeControl value={textSize} onChange={onTextSize} />
          </div>
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

          <VoiceStatePanel
            state={voice}
            transcript={transcript}
            guidance={guidance}
            onReplay={() => void onReplay()}
            replayBusy={replaying || busy}
          />

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
                  if (id === 'type') {
                    setError(null);
                    setMoreWaysOpen(true);
                  }
                  if (id === 'stop') {
                    setError(null);
                    setVoice('idle');
                    setArea('home');
                  }
                }}
              />
            </div>
          ) : null}

          {/* First-visit help: real, working phrases. Shown only while the
              session is fresh — never on top of an active task. */}
          {!activeTask && !transcript && voice !== 'listening' && !error ? (
            <div className="mt-6">
              <p className="section-label">Try saying</p>
              <div className="chips">
                {STARTER_PHRASES.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    className="chip"
                    disabled={busy}
                    onClick={() => void runTurn(phrase)}
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {activeTask && task ? (
            <div className="mt-4">
              {task === 'ORDER_FOOD' && foodProviderStatus?.mode === 'swiggy' ? (
                <SwiggyFoodOrderView
                  status={foodProviderStatus}
                  onBack={() => {
                    setTask(null);
                    setStatus('idle');
                    setVoice('idle');
                    setArea('home');
                  }}
                />
              ) : (
                <TaskScreen
                  kind={task}
                  title={TASK_TITLES[task]}
                  instruction={guidance}
                  summary={summaryRows(fields, total)}
                  practiceRun={task === 'ORDER_FOOD' || task === 'SEND_PAYMENT'}
                />
              )}
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

          <Disclosure
            label="More ways to talk to Thuna"
            open={moreWaysOpen}
            onToggle={setMoreWaysOpen}
          >
            <label className="section-label" htmlFor="typed-input">
              Type instead
            </label>
            <input
              id="typed-input"
              className="field"
              value={typed}
              enterKeyHint="send"
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !busy && typed.trim().length > 0) {
                  const text = typed.trim();
                  setTyped('');
                  void runTurn(text);
                }
              }}
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

            <div className="mt-6">
              <button
                type="button"
                className="btn btn--quiet"
                disabled={busy}
                onClick={() => void onDemoVoice()}
              >
                Use demo voice
              </button>
              <VoiceUpload onAudio={onUploadedAudio} busy={busy} />
            </div>
          </Disclosure>

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

          <Section label="Create a reminder">
            <div className="card">
              <label className="section-label" htmlFor="reminder-request">
                Tell Thuna naturally
              </label>
              <textarea
                id="reminder-request"
                className="field"
                rows={3}
                value={reminderRequest}
                onChange={(event) => {
                  setReminderRequest(event.target.value);
                  setPlannedReminder(null);
                }}
                placeholder="Remind me every day at 8 in the morning to take my medicine"
              />
              {reminderError ? (
                <p className="caption mt-4" role="alert">
                  {reminderError}
                </p>
              ) : null}
              <div className="mt-4">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={busy || !reminderRequest.trim()}
                  onClick={() => {
                    setBusy(true);
                    setReminderError('');
                    void fetch('/api/companion/plan', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        utterance: reminderRequest,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      }),
                    })
                      .then(async (response) => {
                        const data = (await response.json()) as PlannedReminder & {
                          error?: { message?: string };
                        };
                        if (!response.ok) {
                          throw new Error(data.error?.message || 'I could not plan that reminder.');
                        }
                        setPlannedReminder(data);
                      })
                      .catch((planningError: Error) =>
                        setReminderError(planningError.message),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  Review reminder
                </button>
              </div>

              {plannedReminder ? (
                <div className="mt-6">
                  <p className="body-text">
                    <strong>{plannedReminder.plan.readback}</strong>
                  </p>
                  <p className="caption mt-4">
                    {new Date(plannedReminder.plan.scheduledFor).toLocaleString()} ·{' '}
                    {plannedReminder.plan.recurrence.frequency.toLowerCase()}
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        setReminderError('');
                        void fetch('/api/companion/plan', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            confirm: true,
                            proposalId: plannedReminder.proposalId,
                          }),
                        })
                          .then(async (response) => {
                            const data = (await response.json()) as {
                              error?: { message?: string };
                            };
                            if (!response.ok) {
                              throw new Error(data.error?.message || 'I could not save that reminder.');
                            }
                            setPlannedReminder(null);
                            setReminderRequest('');
                            await refresh();
                          })
                          .catch((savingError: Error) =>
                            setReminderError(savingError.message),
                          )
                          .finally(() => setBusy(false));
                      }}
                    >
                      Yes, save it
                    </button>
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={() => setPlannedReminder(null)}
                    >
                      Change it
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </Section>

          <Section label="Check-ins">
            {(home?.routines ?? []).length === 0 ? (
              <div className="card">
                <p className="body-text">Nothing scheduled yet.</p>
                <p className="caption mt-4">
                  Try a short practice one — it checks in after ten seconds, and
                  you can mark it done or ask for more time.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      void clientApi
                        .createMedicineReminder()
                        .then(refresh)
                        .finally(() => setBusy(false));
                    }}
                  >
                    Set a practice reminder
                  </button>
                </div>
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
