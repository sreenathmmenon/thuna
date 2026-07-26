import type { ParsedCommand, ScreenState, SessionCtx } from '../types';
import { defineSkill, type GovernedTaskSkill } from './contract';

export type GeneralHelpTopic =
  | 'upi'
  | 'cvv'
  | 'airplane_mode'
  | 'payment_pending'
  | 'location_permission'
  | 'qr_code';

export interface GeneralHelpEntry {
  topic: GeneralHelpTopic;
  label: string;
  explanation: string;
}

export const GENERAL_HELP_TOPICS: Record<GeneralHelpTopic, GeneralHelpEntry> = {
  upi: {
    topic: 'upi',
    label: 'UPI',
    explanation: 'UPI is a way to move money between bank accounts using a trusted payment app. Check the full recipient name and amount before approving, and never share your UPI PIN.',
  },
  cvv: {
    topic: 'cvv',
    label: 'CVV',
    explanation: 'A CVV is the security number printed on a payment card. Keep it private. Thuna will never ask you to say, type, or store it.',
  },
  airplane_mode: {
    topic: 'airplane_mode',
    label: 'Airplane mode',
    explanation: 'Airplane mode turns off the phone’s cellular connections. Wi-Fi and Bluetooth may also turn off, but you can choose to switch them on again.',
  },
  payment_pending: {
    topic: 'payment_pending',
    label: 'Payment pending',
    explanation: 'Payment pending means the bank or payment service has not confirmed a final result yet. Check the official app or bank statement later, and do not pay again until the status is clear.',
  },
  location_permission: {
    topic: 'location_permission',
    label: 'Location permission',
    explanation: 'Location permission lets an app use your phone’s location. Allow it only for an app you trust and only when the feature needs it; “while using the app” is usually the narrower choice.',
  },
  qr_code: {
    topic: 'qr_code',
    label: 'QR code',
    explanation: 'A QR code is a square pattern a camera can read to open information or prepare a payment. Before paying, verify the recipient and amount, and never share your PIN.',
  },
};

export function detectGeneralHelpTopic(text: string): GeneralHelpTopic | null {
  if (/\bupi\b/i.test(text)) return 'upi';
  if (/\bcvv\b/i.test(text)) return 'cvv';
  if (/airplane|flight mode/i.test(text)) return 'airplane_mode';
  if (/payment.*pending|pending.*payment/i.test(text)) return 'payment_pending';
  if (/location.*permission|permission.*location/i.test(text)) return 'location_permission';
  if (/\bqr\b|quick response code/i.test(text)) return 'qr_code';
  return null;
}

export function explainGeneralHelp(topic: GeneralHelpTopic): string {
  return `${GENERAL_HELP_TOPICS[topic].explanation} This is guidance only; Thuna does not control an external app.`;
}

function parseGeneralHelp(utterance: string, ctx: SessionCtx): ParsedCommand | null {
  const topic = detectGeneralHelpTopic(utterance);
  if (!topic) return null;
  return {
    kind: ctx.fields.topic ? 'correction' : 'start',
    patch: {
      topic,
      topicLabel: GENERAL_HELP_TOPICS[topic].label,
      explanation: explainGeneralHelp(topic),
    },
  };
}

function generalReadback(ctx: SessionCtx): string {
  const topic = ctx.fields.topic as GeneralHelpTopic | undefined;
  return topic && GENERAL_HELP_TOPICS[topic]
    ? explainGeneralHelp(topic)
    : 'Ask about UPI, CVV, airplane mode, payment pending, location permission, or QR codes. Thuna does not control an external app.';
}

function generalScreen(ctx: SessionCtx): ScreenState {
  return {
    skillId: GENERAL_HELP.id,
    step: GENERAL_HELP.steps[ctx.stepIndex]?.id,
    fields: { ...ctx.fields },
    status: 'idle',
  };
}

export const GENERAL_HELP: GovernedTaskSkill = defineSkill({
  id: 'GENERAL_HELP',
  label: 'General digital help',
  metadata: {
    kind: 'information',
    description: 'Explain common digital terms in plain, safety-aware language.',
    utteranceHints: ['what is UPI', 'what does CVV mean', 'explain QR code'],
    capabilities: ['upi', 'cvv', 'airplane_mode', 'payment_pending', 'location_permission', 'qr_code'],
    externalAction: 'none',
    requiresExplicitConfirmation: false,
    completionLabel: 'GUIDANCE COMPLETE',
    disclaimer: 'This is guidance only — Thuna does not control an external app.',
    safetyInvariants: ['no_external_app_control_claim', 'credential_privacy'],
  },
  requiredFields: ['topic'],
  steps: [
    {
      id: 'ask_topic',
      prompt: 'Ask about UPI, CVV, airplane mode, payment pending, location permission, or QR codes.',
      field: 'topic',
    },
    { id: 'explain', prompt: 'I will explain it without controlling any app.' },
  ],
  safetyRules: [
    {
      id: 'credential_privacy',
      type: 'refuse_pattern',
      pattern: 'otp|pin|cvv|card number|password',
      message: 'Explain credential terms, but never request, accept, or store credential values.',
    },
  ],
  completionCondition: 'The requested concept is explained without claiming control of an external app.',
  complete(ctx) {
    return {
      simulated: false,
      label: 'GUIDANCE COMPLETE',
      summary: generalReadback(ctx),
      disclaimer: GENERAL_HELP.metadata.disclaimer,
    };
  },
  handler: {
    parseCommand: parseGeneralHelp,
    answerContextual(question) {
      const topic = detectGeneralHelpTopic(question);
      return topic ? explainGeneralHelp(topic) : null;
    },
    readback: generalReadback,
    buildScreen: generalScreen,
  },
});
