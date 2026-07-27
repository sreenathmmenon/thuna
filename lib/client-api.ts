import type {
  CandidateField,
  ContinuitySnapshot,
  DailyBrief,
  FamilyAttentionRequest,
  FamilyRequestState,
  InboxCandidate,
  LifeEvent,
  PendingLoop,
} from './continuity/types';

export type ProductArea =
  | 'home'
  | 'talk'
  | 'help'
  | 'routines'
  | 'life'
  | 'history'
  | 'family'
  | 'settings';

export type VoicePhase =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'understanding'
  | 'speaking'
  | 'error';

export type SupportedLanguage = 'English' | 'Malayalam' | 'Hindi';

export type TaskKind =
  | 'ORDER_FOOD'
  | 'SEND_PAYMENT'
  | 'PHONE_HELP'
  | 'TRACK_ORDER'
  | 'GENERAL_HELP'
  | 'UNSUPPORTED';

export type RoutineKind =
  | 'MEDICINE_REMINDER'
  | 'WATER_REMINDER'
  | 'BILL_REMINDER'
  | 'FAMILY_CALL_REMINDER'
  | 'DELIVERY_FOLLOW_UP'
  | 'APPOINTMENT_REMINDER'
  | 'MEAL_REMINDER'
  | 'EXERCISE_REMINDER'
  | 'GENERAL_CHECK_IN';

export type RoutineStatus =
  | 'SCHEDULED'
  | 'DUE'
  | 'ACTIVE'
  | 'SNOOZED'
  | 'COMPLETED'
  | 'MISSED'
  | 'ESCALATED'
  | 'CANCELLED';

export interface RoutineSummary {
  id: string;
  kind: RoutineKind;
  title: string;
  detail: string;
  dueLabel: string;
  status: RoutineStatus;
}

export interface HistoryItem {
  id: string;
  icon: 'food' | 'payment' | 'routine' | 'safety' | 'help';
  title: string;
  detail: string;
  time: string;
  simulated?: boolean;
}

export interface TrustedContact {
  id: string;
  name: string;
  relation: string;
  canNotify: boolean;
}

export interface HomeSnapshot {
  elderName: string;
  language: SupportedLanguage;
  pace: 'Normal' | 'Slow';
  nextRoutine: RoutineSummary | null;
  recentActivity: HistoryItem;
  routines: RoutineSummary[];
  history: HistoryItem[];
  contacts: TrustedContact[];
}

export interface InspectorSnapshot {
  transcript: string;
  intent: TaskKind | RoutineKind | 'NONE';
  parsedCommand: {
    kind: string;
    skillId?: string;
    recoveryType?: 'wait' | 'repeat_slowly' | 'go_back' | 'stop';
    patch?: Record<string, unknown>;
  };
  entities: Record<string, unknown>;
  skillOrRoutine: string;
  step: string;
  sessionState: string;
  safetyDecision: string;
  events: string[];
  latencyMs: number;
  fallback: string;
}

export interface VoiceTurn {
  transcript: string;
  guidance: string;
  task: TaskKind;
  inspector: InspectorSnapshot;
}

export interface ClientApi {
  loadHome(): Promise<HomeSnapshot>;
  requestMicrophone(): Promise<'granted' | 'demo-only'>;
  finishMicrophoneTranscript(): Promise<string>;
  finishMicrophoneTurn(): Promise<VoiceTurn>;
  runPrerecordedVoiceTurn(): Promise<VoiceTurn>;
  /**
   * Run a full voice turn from an uploaded audio file, through the same Saaras
   * route the microphone uses. This bypasses live recording without bypassing
   * any engine or safety logic.
   */
  uploadAudioTurn(file: Blob, filename?: string): Promise<VoiceTurn>;
  interpretDemoText(text: string): Promise<VoiceTurn>;
  /**
   * Speak the last guidance again, slowly. Touches no engine or session state;
   * returns false when nothing has been spoken yet this session.
   */
  replayGuidance(): Promise<boolean>;
  createMedicineReminder(delaySeconds?: number): Promise<string>;
  triggerDueRoutines(): Promise<void>;
  updateRoutine(
    routineId: string,
    action: 'COMPLETE' | 'SNOOZE' | 'NO_RESPONSE' | 'CANCEL',
    details?: Record<string, unknown>,
  ): Promise<void>;
  requestFamilyHelp(routineId?: string): Promise<void>;
  setFamilyConsent(enabled: boolean): Promise<void>;
  loadContinuity(): Promise<ContinuitySnapshot>;
  intakeContinuity(text: string, source: 'VOICE' | 'TYPED'): Promise<InboxCandidate>;
  correctContinuityCandidate(
    id: string,
    key: string,
    value: CandidateField['value'],
  ): Promise<InboxCandidate>;
  confirmContinuityCandidate(id: string): Promise<{
    lifeEvent?: LifeEvent;
    pendingLoop?: PendingLoop;
    familyRequest?: FamilyAttentionRequest;
  }>;
  updateLifeEvent(
    id: string,
    action: 'CORRECT_EVENT' | 'COMPLETE_EVENT' | 'SNOOZE_EVENT' | 'CANCEL_EVENT',
    details?: Record<string, unknown>,
  ): Promise<LifeEvent>;
  updatePendingLoop(
    id: string,
    action: 'SNOOZE_LOOP' | 'COMPLETE_LOOP' | 'CANCEL_LOOP',
    details?: Record<string, unknown>,
  ): Promise<PendingLoop>;
  loadDailyBrief(): Promise<DailyBrief>;
  setFamilyContentConsent(granted: boolean): Promise<void>;
  createContinuityFamilyRequest(purpose: string): Promise<FamilyAttentionRequest>;
  advanceContinuityFamilyRequest(
    id: string,
    target: FamilyRequestState | 'OFFERED',
  ): Promise<FamilyAttentionRequest>;
  updatePreferences(language: SupportedLanguage, pace: 'Normal' | 'Slow'): Promise<void>;
  resetDemo(): Promise<HomeSnapshot>;
}

const initialRoutines: RoutineSummary[] = [
  {
    id: 'medicine-morning',
    kind: 'MEDICINE_REMINDER',
    title: 'Morning medicine',
    detail: 'A reminder only — Thuna never changes dosage.',
    dueLabel: 'Today, 9:00 AM',
    status: 'SCHEDULED',
  },
  {
    id: 'water-afternoon',
    kind: 'WATER_REMINDER',
    title: 'Drink water',
    detail: 'A gentle afternoon check-in.',
    dueLabel: 'Today, 2:30 PM',
    status: 'SCHEDULED',
  },
];

const initialHistory: HistoryItem[] = [
  {
    id: 'history-food',
    icon: 'food',
    title: 'Food order practice completed',
    detail: 'Plain Dosa from Udupi Cafe',
    time: 'Yesterday, 7:12 PM',
    simulated: true,
  },
  {
    id: 'history-routine',
    icon: 'routine',
    title: 'Water reminder completed',
    detail: 'Marked complete after one check-in',
    time: 'Yesterday, 2:35 PM',
  },
];

const initialContacts: TrustedContact[] = [
  { id: 'sree', name: 'Sree', relation: 'Family', canNotify: false },
];

function cloneSnapshot(): HomeSnapshot {
  return {
    elderName: 'Appa',
    language: 'Malayalam',
    pace: 'Slow',
    nextRoutine: { ...initialRoutines[0] },
    recentActivity: { ...initialHistory[0] },
    routines: initialRoutines.map((routine) => ({ ...routine })),
    history: initialHistory.map((item) => ({ ...item })),
    contacts: initialContacts.map((contact) => ({ ...contact })),
  };
}

function riskyRequest(text: string): boolean {
  return /\b(otp|pin|cvv|card number|password)\b/i.test(text);
}

function taskFor(text: string): TaskKind {
  if (riskyRequest(text)) return 'UNSUPPORTED';
  if (/\b(pay|payment|send money|upi)\b/i.test(text)) return 'SEND_PAYMENT';
  if (/\b(phone|text size|wi-?fi|photo)\b/i.test(text)) return 'PHONE_HELP';
  if (/\b(track|delivery|parcel)\b/i.test(text)) return 'TRACK_ORDER';
  if (/\b(order|food|dosa|hungry)\b/i.test(text)) return 'ORDER_FOOD';
  if (/\b(what is|explain|how does|qr code|airplane mode|location)\b/i.test(text)) return 'GENERAL_HELP';
  return 'UNSUPPORTED';
}

function guidanceFor(task: TaskKind, text: string): string {
  if (riskyRequest(text)) {
    return 'Please do not share an OTP, PIN or CVV with me or anyone else. I have stopped this task. I can help you contact Sree if you choose.';
  }

  const guidance: Record<TaskKind, string> = {
    ORDER_FOOD: 'I found your usual dosa order. I will show every detail before you confirm. No real order will be placed in this demo.',
    SEND_PAYMENT: 'Let us first choose the correct Priya. I will read back the person and amount before any simulated payment.',
    PHONE_HELP: 'I can guide you one step at a time. Start by opening Settings on your phone.',
    TRACK_ORDER: 'Your practice order is out for delivery. The service has not provided a guaranteed arrival time.',
    GENERAL_HELP: 'I can explain that in simple steps. You can ask me to repeat more slowly at any time.',
    UNSUPPORTED: 'I cannot safely complete that task. I can pause here or ask your trusted family contact, with your permission.',
  };
  return guidance[task];
}

const MOCK_LATENCY_MS = 420;

const SESSION_ID = 'thuna-demo';

interface MemoryResponse {
  memory: {
    profile: {
      name: string;
      preferredLanguage: string;
      preferredPace: 'normal' | 'slow';
    } | null;
    trustedFamilyContacts: Array<{
      id: string;
      name: string;
      relation: string;
      notificationConsent: boolean;
    }>;
    history: Record<string, Array<{
      id: string;
      summary: string;
      occurredAt: string;
      metadata?: Record<string, unknown>;
    }>>;
  };
}

interface RoutineApiItem {
  id: string;
  type: RoutineKind;
  title: string;
  reminderText: string;
  scheduledFor: string;
  state: RoutineStatus;
}

interface SessionTurnResponse {
  transcript: string;
  command: InspectorSnapshot['parsedCommand'] & {
    confidence: number;
    latencyMs: number;
    demoFallback: boolean;
  };
  response: {
    speak?: string;
    action?: string;
    screen?: {
      skillId?: string;
      step?: string;
      fields: Record<string, unknown>;
      status: string;
    };
  };
  state: {
    ctx: {
      skillId?: string;
      fields: Record<string, unknown>;
    };
    screen: {
      skillId?: string;
      step?: string;
      fields: Record<string, unknown>;
      status: string;
    };
    history: Array<{ type: string; detail: string }>;
  };
  modelInvoked: boolean;
  latencyMs: number;
}

let recorder: MediaRecorder | null = null;
let recorderStream: MediaStream | null = null;
let audioChunks: Blob[] = [];

/**
 * The most recent guidance Thuna spoke aloud, kept so the elder can ask to
 * hear it again without re-running the turn (no engine state is touched).
 */
let lastSpokenGuidance: string | null = null;

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = await response.json() as T & {
    error?: { message?: string };
    message?: string;
  };
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || `Request failed (${response.status})`);
  }
  return data;
}

async function continuityAction<T>(
  action: string,
  details: Record<string, unknown> = {},
): Promise<T> {
  return fetchJson<T>('/api/continuity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...details }),
  });
}

function fallbackTurn(text: string, reason: string): VoiceTurn {
  const transcript = text.trim() || 'Order my usual dosa, without chutney';
  const task = taskFor(transcript);
  const isRisky = riskyRequest(transcript);
  const entities: Record<string, unknown> =
    task === 'ORDER_FOOD'
      ? { item: 'Masala Dosa', removeChutney: true }
      : {};
  return {
    transcript,
    guidance: guidanceFor(task, transcript),
    task,
    inspector: {
      transcript,
      intent: isRisky ? 'UNSUPPORTED' : task,
      parsedCommand: {
        kind: isRisky ? 'refuse' : 'start',
        skillId: isRisky ? undefined : task,
      },
      entities,
      skillOrRoutine: isRisky ? 'RISKY_REQUEST' : task,
      step: isRisky ? 'safety_refusal' : 'start',
      sessionState: isRisky ? 'refused' : 'active',
      safetyDecision: isRisky
        ? 'Blocked before model invocation'
        : 'Deterministic client fallback; no state-changing external action',
      events: [isRisky ? 'safety_refusal' : 'client_fallback'],
      latencyMs: MOCK_LATENCY_MS,
      fallback: reason,
    },
  };
}

async function speakGuidance(
  text: string,
  pace: 'Normal' | 'Slow' = 'Slow',
): Promise<string> {
  if (typeof window === 'undefined') return 'Speech deferred to browser';
  lastSpokenGuidance = text;
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        pace: pace.toLowerCase(),
        fallbackId: /\b(otp|pin|cvv)\b/i.test(text)
          ? 'safety'
          : /medicine reminder/i.test(text)
            ? 'medicine'
            : 'order',
      }),
    });
    if (!response.ok) throw new Error('Bulbul unavailable');
    const fallbackHeader = response.headers.get('X-Thuna-Demo-Fallback');
    const audioUrl = URL.createObjectURL(await response.blob());
    const audio = new Audio(audioUrl);
    audio.addEventListener('ended', () => URL.revokeObjectURL(audioUrl), { once: true });
    await audio.play();
    return fallbackHeader === 'pregenerated-bulbul'
      ? 'Pre-generated Bulbul fallback'
      : 'Bulbul v3';
  } catch {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = pace === 'Slow' ? 0.8 : 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return 'Browser speech fallback';
    }
    return 'Speech unavailable; text guidance shown';
  }
}

async function processTranscript(
  transcript: string,
  inputMode:
    | 'Live Saaras v3'
    | 'Prerecorded Saaras audio'
    | 'Uploaded Saaras audio'
    | 'Typed demo transcript',
): Promise<VoiceTurn> {
  const data = await fetchJson<SessionTurnResponse>('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: SESSION_ID, transcript }),
  });
  const skill = data.state.ctx.skillId || data.command.skillId;
  const task = (
    skill && ['ORDER_FOOD', 'SEND_PAYMENT', 'PHONE_HELP', 'TRACK_ORDER', 'GENERAL_HELP', 'UNSUPPORTED'].includes(skill)
      ? skill
      : taskFor(transcript)
  ) as TaskKind;
  const guidance = data.response.speak || 'Please try that again.';
  const speechMode = await speakGuidance(guidance);
  const risky = !data.modelInvoked && riskyRequest(transcript);
  return {
    transcript,
    guidance,
    task,
    inspector: {
      transcript,
      intent: task,
      parsedCommand: data.command,
      entities: data.state.screen.fields,
      skillOrRoutine: risky ? 'RISKY_REQUEST' : skill || task,
      step: data.state.screen.step || data.response.action || 'ready',
      sessionState: data.state.screen.status,
      safetyDecision: risky
        ? 'Blocked before model invocation'
        : 'Validated command reached deterministic engine; engine owns state',
      events: data.state.history.map((event) => event.type),
      latencyMs: data.latencyMs,
      fallback: [
        inputMode,
        !data.modelInvoked
          ? 'pre-AI safety rule; model skipped'
          : data.command.demoFallback
            ? 'deterministic interpretation fallback'
            : 'Sarvam structured interpretation',
        speechMode,
      ].join(' → '),
    },
  };
}

export const clientApi: ClientApi = {
  async loadHome() {
    try {
      const [memoryData, routineData] = await Promise.all([
        fetchJson<MemoryResponse>('/api/memory'),
        fetchJson<{ routines: RoutineApiItem[] }>('/api/routines'),
      ]);
      const profile = memoryData.memory.profile;
      if (!profile) return cloneSnapshot();
      const routines = routineData.routines.map((routine) => ({
        id: routine.id,
        kind: routine.type,
        title: routine.title,
        detail: routine.reminderText,
        dueLabel: new Date(routine.scheduledFor).toLocaleString(),
        status: routine.state,
      }));
      const memoryHistory = Object.values(memoryData.memory.history).flat()
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .map((entry): HistoryItem => ({
          id: entry.id,
          icon: entry.metadata?.skillId === 'SEND_PAYMENT'
            ? 'payment'
            : entry.metadata?.skillId
              ? 'food'
              : 'routine',
          title: entry.summary,
          detail: String(entry.metadata?.skillId || 'Thuna activity'),
          time: new Date(entry.occurredAt).toLocaleString(),
          simulated: entry.metadata?.simulated === true,
        }));
      const history = memoryHistory.length ? memoryHistory : initialHistory.map((item) => ({ ...item }));
      /* Real routines only. Substituting demo routines here would render
         cards whose ids do not exist on the server, so Done/Snooze would
         silently fail — an empty list with a way to act is the honest state. */
      return {
        elderName: profile.name,
        language:
          profile.preferredLanguage === 'Malayalam' || profile.preferredLanguage === 'Hindi'
            ? profile.preferredLanguage
            : 'English',
        pace: profile.preferredPace === 'slow' ? 'Slow' : 'Normal',
        nextRoutine: routines[0] ?? null,
        recentActivity: history[0],
        routines,
        history,
        contacts: memoryData.memory.trustedFamilyContacts.map((contact) => ({
          id: contact.id,
          name: contact.name,
          relation: contact.relation,
          canNotify: contact.notificationConsent,
        })),
      };
    } catch {
      return cloneSnapshot();
    }
  },

  async requestMicrophone() {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      return 'demo-only';
    }

    try {
      recorderStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((type) => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(
        recorderStream,
        preferredType ? { mimeType: preferredType } : undefined,
      );
      audioChunks = [];
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      });
      recorder.start();
      return 'granted';
    } catch {
      recorderStream?.getTracks().forEach((track) => track.stop());
      recorderStream = null;
      recorder = null;
      return 'demo-only';
    }
  },

  async finishMicrophoneTranscript() {
    if (!recorder || !recorderStream) {
      throw new Error('No microphone recording is active.');
    }
    const activeRecorder = recorder;
    const activeStream = recorderStream;
    const audio = await new Promise<Blob>((resolve, reject) => {
      activeRecorder.addEventListener('error', () => reject(new Error('Recording failed.')), { once: true });
      activeRecorder.addEventListener('stop', () => {
        resolve(new Blob(audioChunks, { type: activeRecorder.mimeType || 'audio/webm' }));
      }, { once: true });
      activeRecorder.stop();
    });
    activeStream.getTracks().forEach((track) => track.stop());
    recorder = null;
    recorderStream = null;
    audioChunks = [];
    const form = new FormData();
    const extension = audio.type.includes('mp4')
      ? 'mp4'
      : audio.type.includes('wav')
        ? 'wav'
        : 'webm';
    form.append('audio', audio, `thuna-recording.${extension}`);
    const stt = await fetchJson<{ transcript: string }>('/api/stt', {
      method: 'POST',
      body: form,
    });
    return stt.transcript;
  },

  async finishMicrophoneTurn() {
    const transcript = await this.finishMicrophoneTranscript();
    return processTranscript(transcript, 'Live Saaras v3');
  },

  async runPrerecordedVoiceTurn() {
    const response = await fetch('/audio/order-usual.wav', { cache: 'no-store' });
    if (!response.ok) throw new Error('The demo voice recording is unavailable.');
    const form = new FormData();
    form.append('audio', await response.blob(), 'order-usual.wav');
    const stt = await fetchJson<{ transcript: string }>('/api/stt', {
      method: 'POST',
      body: form,
    });
    return processTranscript(stt.transcript, 'Prerecorded Saaras audio');
  },

  async uploadAudioTurn(file, filename = 'upload.wav') {
    const form = new FormData();
    form.append('audio', file, filename);
    const stt = await fetchJson<{ transcript: string }>('/api/stt', {
      method: 'POST',
      body: form,
    });
    if (!stt.transcript?.trim()) {
      throw new Error('I could not hear anything in that recording.');
    }
    return processTranscript(stt.transcript, 'Uploaded Saaras audio');
  },

  async interpretDemoText(text) {
    const transcript = text.trim() || 'Order my usual dosa, without chutney';
    try {
      return await processTranscript(transcript, 'Typed demo transcript');
    } catch {
      return fallbackTurn(transcript, 'API unavailable → deterministic typed fallback');
    }
  },

  async createMedicineReminder(delaySeconds = 10) {
    const data = await fetchJson<{ routine: RoutineApiItem }>('/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'MEDICINE_REMINDER',
        title: 'Morning medicine',
        scheduledFor: new Date(Date.now() + delaySeconds * 1000).toISOString(),
      }),
    });
    return data.routine.id;
  },

  async triggerDueRoutines() {
    await fetchJson('/api/routines/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // UI countdowns and the server clock can differ by a request round trip.
      // The five-second demo window keeps the trigger deterministic without
      // changing production scheduling semantics.
      body: JSON.stringify({ at: new Date(Date.now() + 5_000).toISOString() }),
    });
  },

  async updateRoutine(routineId, action, details = {}) {
    await fetchJson(`/api/routines/${encodeURIComponent(routineId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...details }),
    });
  },

  async requestFamilyHelp(routineId) {
    await fetchJson('/api/family/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: 'sree',
        elderExplicitlyRequested: true,
        reason: 'Appa explicitly requested help in Thuna.',
      }),
    });
    if (routineId) {
      await fetchJson('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routineId, explicitConsent: true }),
      });
    }
  },

  async setFamilyConsent(enabled) {
    await fetchJson('/api/family/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: 'sree',
        notificationConsent: enabled,
        explicitElderConfirmation: true,
        source: 'elder_settings',
      }),
    });
  },

  async loadContinuity() {
    const data = await fetchJson<{ continuity: ContinuitySnapshot }>('/api/continuity');
    return data.continuity;
  },

  async intakeContinuity(text, source) {
    const data = await continuityAction<{ candidate: InboxCandidate }>('INTAKE', {
      text,
      source,
    });
    return data.candidate;
  },

  async correctContinuityCandidate(id, key, value) {
    const data = await continuityAction<{ candidate: InboxCandidate }>('CORRECT_CANDIDATE', {
      id,
      key,
      value,
    });
    return data.candidate;
  },

  async confirmContinuityCandidate(id) {
    return continuityAction('CONFIRM_CANDIDATE', { id, response: 'Yes' });
  },

  async updateLifeEvent(id, action, details = {}) {
    const data = await continuityAction<{ lifeEvent: LifeEvent }>(action, {
      id,
      ...details,
    });
    return data.lifeEvent;
  },

  async updatePendingLoop(id, action, details = {}) {
    const data = await continuityAction<{ pendingLoop: PendingLoop }>(action, {
      id,
      ...details,
    });
    return data.pendingLoop;
  },

  async loadDailyBrief() {
    const data = await continuityAction<{ brief: DailyBrief }>('DAILY_BRIEF', {
      onDemand: true,
    });
    return data.brief;
  },

  async setFamilyContentConsent(granted) {
    await this.setFamilyConsent(granted);
    await continuityAction('SET_FAMILY_CONTENT_CONSENT', {
      contactId: 'sree',
      granted,
      explicitApproval: true,
    });
  },

  async createContinuityFamilyRequest(purpose) {
    const data = await continuityAction<{ familyRequest: FamilyAttentionRequest }>(
      'CREATE_FAMILY_REQUEST',
      {
        contactId: 'sree',
        purpose,
        disclosure: 'Appa asked Sree to follow up.',
        explicitApproval: true,
      },
    );
    return data.familyRequest;
  },

  async advanceContinuityFamilyRequest(id, target) {
    if (target === 'OFFERED') {
      const data = await continuityAction<{
        request: FamilyAttentionRequest;
      }>('OFFER_FAMILY_REQUEST', { id });
      return data.request;
    }
    const data = await continuityAction<{ familyRequest: FamilyAttentionRequest }>(
      'TRANSITION_FAMILY_REQUEST',
      {
        id,
        target,
        scheduledFor: target === 'SCHEDULED'
          ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
          : undefined,
        response: target === 'ELDER_CONFIRMED' ? 'Yes' : undefined,
      },
    );
    return data.familyRequest;
  },

  async replayGuidance() {
    if (!lastSpokenGuidance) return false;
    await speakGuidance(lastSpokenGuidance, 'Slow');
    return true;
  },

  async updatePreferences(language, pace) {
    await fetchJson('/api/memory/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferredLanguage: language,
        preferredPace: pace.toLowerCase(),
      }),
    });
  },

  async resetDemo() {
    await Promise.allSettled([
      fetch('/api/memory/reset', { method: 'POST' }),
      fetch('/api/routines', { method: 'DELETE' }),
      fetch('/api/continuity', { method: 'DELETE' }),
      fetch(`/api/session?sessionId=${encodeURIComponent(SESSION_ID)}`, { method: 'DELETE' }),
    ]);
    return this.loadHome();
  },
};
