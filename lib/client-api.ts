export type ProductArea =
  | 'home'
  | 'talk'
  | 'help'
  | 'routines'
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
  language: 'English' | 'Malayalam';
  pace: 'Normal' | 'Slow';
  nextRoutine: RoutineSummary;
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
  entities: Record<string, string | number | boolean>;
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
  interpretDemoText(text: string): Promise<VoiceTurn>;
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
  { id: 'sree', name: 'Sree', relation: 'Family', canNotify: true },
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

export const clientApi: ClientApi = {
  async loadHome() {
    return cloneSnapshot();
  },

  async requestMicrophone() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return 'demo-only';
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return 'granted';
    } catch {
      return 'demo-only';
    }
  },

  async interpretDemoText(text) {
    const transcript = text.trim() || 'Order my usual dosa, without chutney';
    const task = taskFor(transcript);
    const isRisky = riskyRequest(transcript);
    const entities: Record<string, string | number | boolean> =
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
          patch:
            task === 'ORDER_FOOD'
              ? { items: 'Masala Dosa', excludes: 'chutney' }
              : undefined,
        },
        entities,
        skillOrRoutine: isRisky ? 'RISKY_REQUEST' : task,
        step: isRisky ? 'safety_refusal' : 'start',
        sessionState: isRisky ? 'refused' : 'active',
        safetyDecision: isRisky
          ? 'Blocked before model invocation'
          : 'Allowed — deterministic engine owns state',
        events: [
          isRisky ? 'safety_refusal' : 'route_intent',
          isRisky ? 'task_stopped' : `start_${task.toLowerCase()}`,
        ],
        latencyMs: MOCK_LATENCY_MS,
        fallback: 'Typed mock adapter (integration pending)',
      },
    };
  },

  async resetDemo() {
    return cloneSnapshot();
  },
};
