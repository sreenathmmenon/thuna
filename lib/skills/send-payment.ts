import type { TaskSkill } from '../types';
export const SEND_PAYMENT: TaskSkill = {
  id: 'SEND_PAYMENT',
  label: 'Send payment',
  requiredFields: ['recipient', 'amount'],
  steps: [
    { id: 'ask_recipient', prompt: 'Who should we send the money to?', field: 'recipient' },
    { id: 'ask_amount', prompt: 'How much should we send?', field: 'amount' },
    { id: 'readback', prompt: 'Let me confirm the amount and recipient before sending.', confirmBefore: true },
    { id: 'send', prompt: 'Sending now.' },
  ],
  safetyRules: [
    { id: 'mismatch', type: 'mismatch_check', message: 'I will block a recipient whose name matches but whose relation conflicts with your stated intent (e.g. daughter vs a store).' },
    { id: 'no_credential', type: 'refuse_pattern', pattern: 'otp|pin|cvv|card number|password', message: 'I will never request or accept an OTP, PIN, or CVV.' },
  ],
  completionCondition: 'Payment confirmed with readback; no OTP/PIN handled.',
};
