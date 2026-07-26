import type { ParsedCommand, ScreenState, SessionCtx } from '../types';
import { defineSkill, type GovernedTaskSkill } from './contract';

export type PaymentRecipientKind = 'person' | 'merchant';

export interface PaymentRecipient {
  id: 'priya-menon' | 'priya-stores' | 'priya-nair';
  name: 'Priya Menon' | 'Priya Stores' | 'Priya Nair';
  kind: PaymentRecipientKind;
  semanticHints: string[];
}

export const PAYMENT_RECIPIENTS: readonly PaymentRecipient[] = Object.freeze([
  {
    id: 'priya-menon',
    name: 'Priya Menon',
    kind: 'person',
    semanticHints: ['menon', 'daughter', 'family'],
  },
  {
    id: 'priya-stores',
    name: 'Priya Stores',
    kind: 'merchant',
    semanticHints: ['stores', 'store', 'shop', 'merchant'],
  },
  {
    id: 'priya-nair',
    name: 'Priya Nair',
    kind: 'person',
    semanticHints: ['nair', 'friend', 'neighbour', 'neighbor'],
  },
]);

const PERSON_HINT = /\b(daughter|family|friend|neighbou?r|person)\b/i;
const MERCHANT_HINT = /\b(stores?|shop|merchant|business)\b/i;

function extractAmount(text: string): number | null {
  const match = text.match(/(?:₹|rs\.?|rupees?)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:rupees?|rs\.?)/i);
  const raw = match?.[1] ?? match?.[2];
  if (!raw) return null;
  const amount = Number(raw.replaceAll(',', ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function exactRecipient(text: string): PaymentRecipient | null {
  const lower = text.toLowerCase();
  return PAYMENT_RECIPIENTS.find((recipient) => lower.includes(recipient.name.toLowerCase())) ?? null;
}

function hintedRecipient(text: string): PaymentRecipient | null {
  const lower = text.toLowerCase();
  return PAYMENT_RECIPIENTS.find((recipient) =>
    recipient.semanticHints.some((hint) => new RegExp(`\\b${hint}\\b`, 'i').test(lower)),
  ) ?? null;
}

function mismatchFor(recipient: PaymentRecipient, text: string): string | null {
  if (recipient.kind === 'merchant' && PERSON_HINT.test(text)) {
    return `${recipient.name} is a store, but you described a person. I will not select it. Which Priya do you mean?`;
  }
  if (recipient.kind === 'person' && MERCHANT_HINT.test(text)) {
    return `${recipient.name} is a person, but you described a store. I will not select it. Which Priya do you mean?`;
  }
  return null;
}

export interface RecipientResolution {
  recipient: PaymentRecipient | null;
  warning: string | null;
  candidates: PaymentRecipient[];
}

export function resolvePaymentRecipient(text: string): RecipientResolution {
  if (!/\bpriya\b/i.test(text)) return { recipient: null, warning: null, candidates: [] };

  const recipient = exactRecipient(text) ?? hintedRecipient(text);
  if (!recipient) {
    return {
      recipient: null,
      warning: 'There are three Priyas: Priya Menon, Priya Stores, and Priya Nair. Please say the full name.',
      candidates: [...PAYMENT_RECIPIENTS],
    };
  }

  const warning = mismatchFor(recipient, text);
  return {
    recipient: warning ? null : recipient,
    warning,
    candidates: warning ? [...PAYMENT_RECIPIENTS] : [],
  };
}

function parsePayment(utterance: string, ctx: SessionCtx): ParsedCommand | null {
  const patch: Record<string, unknown> = {};
  const resolution = resolvePaymentRecipient(utterance);
  const amount = extractAmount(utterance);

  if (resolution.recipient) {
    patch.recipient = resolution.recipient.name;
    patch.recipientId = resolution.recipient.id;
    patch.recipientKind = resolution.recipient.kind;
    patch.recipientWarning = null;
    patch.recipientCandidates = [];
  } else if (resolution.warning) {
    // Null deliberately clears a stale selection so a semantic mismatch can
    // never proceed to confirmation.
    patch.recipient = null;
    patch.recipientId = null;
    patch.recipientKind = null;
    patch.recipientWarning = resolution.warning;
    patch.recipientCandidates = resolution.candidates.map((candidate) => candidate.name);
  }

  if (amount !== null) patch.amount = amount;
  if (Object.keys(patch).length === 0) return null;

  const currentRecipient = ctx.fields.recipient;
  const currentAmount = ctx.fields.amount;
  const changedExistingField =
    (patch.recipient !== undefined && currentRecipient != null && patch.recipient !== currentRecipient) ||
    (patch.amount !== undefined && currentAmount != null && patch.amount !== currentAmount);

  return {
    kind: changedExistingField ? 'correction' : 'start',
    patch,
    reason: resolution.warning ?? undefined,
  };
}

function paymentReadback(ctx: SessionCtx): string {
  const recipient = String(ctx.fields.recipient || 'an unselected recipient');
  const amount = Number(ctx.fields.amount);
  const amountText = Number.isFinite(amount) ? `Rs ${amount}` : 'an unselected amount';
  return `Payment of ${amountText} to ${recipient}. No OTP, PIN, or CVV is needed or accepted by Thuna.`;
}

function paymentScreen(ctx: SessionCtx): ScreenState {
  return {
    skillId: SEND_PAYMENT.id,
    step: SEND_PAYMENT.steps[ctx.stepIndex]?.id,
    fields: { ...ctx.fields },
    candidates: Array.isArray(ctx.fields.recipientCandidates) ? ctx.fields.recipientCandidates : undefined,
    status: ctx.awaitingConfirmation ? 'awaiting_confirmation' : 'idle',
  };
}

export const SEND_PAYMENT: GovernedTaskSkill = defineSkill({
  id: 'SEND_PAYMENT',
  label: 'Send payment',
  metadata: {
    kind: 'transaction',
    description: 'Select and verify a known recipient, correct the amount, and simulate a payment.',
    utteranceHints: ['send payment', 'pay Priya', 'send rupees'],
    capabilities: ['semantic_recipient_check', 'correct_recipient', 'correct_amount', 'readback'],
    externalAction: 'simulated',
    requiresExplicitConfirmation: true,
    completionLabel: 'SIMULATED PAYMENT SUCCESS',
    disclaimer: 'This is a simulated result — no real money was sent.',
    safetyInvariants: ['credential_refusal', 'recipient_mismatch_block', 'readback_before_action'],
  },
  requiredFields: ['recipient', 'amount'],
  steps: [
    {
      id: 'ask_recipient',
      prompt: 'Which Priya: Priya Menon, Priya Stores, or Priya Nair? Please say the full name.',
      field: 'recipient',
    },
    { id: 'ask_amount', prompt: 'How many rupees should the simulated payment be?', field: 'amount' },
    { id: 'readback', prompt: 'I will read back the recipient and amount before continuing.', confirmBefore: true },
    { id: 'send', prompt: 'The confirmed payment will be recorded as a simulation.' },
  ],
  safetyRules: [
    {
      id: 'semantic_recipient_mismatch',
      type: 'mismatch_check',
      message: 'A person-versus-store mismatch clears the selection and asks for the full recipient name.',
    },
    {
      id: 'readback_recipient_amount',
      type: 'readback',
      message: 'The full recipient name and amount must be read back before confirmation.',
    },
    {
      id: 'no_credential',
      type: 'refuse_pattern',
      pattern: 'otp|pin|cvv|card number|password',
      message: 'I will never request or accept an OTP, PIN, CVV, card number, or password.',
    },
  ],
  completionCondition: 'A simulated payment may complete only after recipient and amount read-back and explicit confirmation.',
  complete(ctx) {
    return {
      simulated: true,
      label: 'SIMULATED PAYMENT SUCCESS',
      summary: paymentReadback(ctx),
      disclaimer: SEND_PAYMENT.metadata.disclaimer,
    };
  },
  handler: {
    parseCommand: parsePayment,
    readback: paymentReadback,
    buildScreen: paymentScreen,
  },
});
