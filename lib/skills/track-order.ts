import type { ParsedCommand, ScreenState, SessionCtx } from '../types';
import { defineSkill, type GovernedTaskSkill } from './contract';

export type TrackingStatus = 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELAYED';

export interface TrackingSnapshot {
  reference: string;
  status: TrackingStatus;
  guidance: string;
}

const STATUS_GUIDANCE: Record<TrackingStatus, string> = {
  PROCESSING: 'The simulated order is processing. A delivery time has not been verified.',
  SHIPPED: 'The simulated order is shipped. A delivery time has not been verified.',
  OUT_FOR_DELIVERY: 'The simulated order is out for delivery. I cannot promise an arrival time.',
  DELAYED: 'The simulated order is delayed. I do not have a verified new delivery time.',
};

export const DEMO_TRACKING: Readonly<Record<string, TrackingStatus>> = Object.freeze({
  'THUNA-1001': 'PROCESSING',
  'THUNA-1002': 'SHIPPED',
  'THUNA-1003': 'OUT_FOR_DELIVERY',
  'THUNA-1004': 'DELAYED',
});

function normaliseReference(reference: string): string {
  return reference.trim().toUpperCase().replace(/\s+/g, '-');
}

export function lookupTracking(reference: string): TrackingSnapshot | null {
  const normalized = normaliseReference(reference);
  const status = DEMO_TRACKING[normalized];
  if (!status) return null;
  return { reference: normalized, status, guidance: STATUS_GUIDANCE[status] };
}

function extractReference(text: string): string | null {
  const match = text.match(/\b(?:thuna[\s-]?)?100[1-4]\b/i);
  if (!match) return null;
  const raw = match[0];
  return /^thuna/i.test(raw) ? normaliseReference(raw) : `THUNA-${raw}`;
}

function parseTracking(utterance: string, ctx: SessionCtx): ParsedCommand | null {
  const reference = extractReference(utterance);
  if (!reference) return null;
  const snapshot = lookupTracking(reference);
  if (!snapshot) return null;
  return {
    kind: ctx.fields.orderReference ? 'correction' : 'start',
    patch: {
      orderReference: snapshot.reference,
      trackingStatus: snapshot.status,
      trackingGuidance: snapshot.guidance,
      simulated: true,
    },
  };
}

function trackingReadback(ctx: SessionCtx): string {
  const reference = String(ctx.fields.orderReference || '');
  const snapshot = lookupTracking(reference);
  if (!snapshot) {
    return 'I do not have a verified status for that reference. Please check the official order app; I will not invent a delivery promise.';
  }
  return `SIMULATED TRACKING — ${snapshot.reference}: ${snapshot.guidance}`;
}

function trackingScreen(ctx: SessionCtx): ScreenState {
  return {
    skillId: TRACK_ORDER.id,
    step: TRACK_ORDER.steps[ctx.stepIndex]?.id,
    fields: { ...ctx.fields },
    status: 'idle',
  };
}

export const TRACK_ORDER: GovernedTaskSkill = defineSkill({
  id: 'TRACK_ORDER',
  label: 'Track an order',
  metadata: {
    kind: 'information',
    description: 'Show a deterministic simulated order status without making a delivery promise.',
    utteranceHints: ['track order', 'where is my order', 'order status'],
    capabilities: ['processing', 'shipped', 'out_for_delivery', 'delayed'],
    externalAction: 'simulated',
    requiresExplicitConfirmation: false,
    completionLabel: 'SIMULATED TRACKING RESULT',
    disclaimer: 'This is simulated tracking — it is not a live courier update.',
    safetyInvariants: ['no_invented_delivery_promise', 'clearly_simulated_status'],
  },
  requiredFields: ['orderReference'],
  steps: [
    { id: 'ask_reference', prompt: 'What is the demo order reference?', field: 'orderReference' },
    { id: 'show_status', prompt: 'I will show its simulated status without promising a delivery time.' },
  ],
  safetyRules: [
    {
      id: 'no_delivery_promise',
      type: 'readback',
      message: 'State only the known status and never invent an arrival or delivery promise.',
    },
  ],
  completionCondition: 'A known simulated status is shown with no invented delivery promise.',
  complete(ctx) {
    return {
      simulated: true,
      label: 'SIMULATED TRACKING RESULT',
      summary: trackingReadback(ctx),
      disclaimer: TRACK_ORDER.metadata.disclaimer,
    };
  },
  handler: {
    parseCommand: parseTracking,
    readback: trackingReadback,
    buildScreen: trackingScreen,
  },
});
