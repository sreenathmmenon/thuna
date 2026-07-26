import type { ParsedCommand, ScreenState, SessionCtx } from '../types';
import { defineSkill, type GovernedTaskSkill } from './contract';

const CLEAR_CONSENT = /^(yes|yes please|i consent|ask (?:my )?family|request family help|please ask (?:my )?family)\b/i;
const DECLINE = /^(no|not now|do not|don't|stop|cancel)\b/i;

export function unsupportedGuidance(request: string): string {
  const summary = request.trim() || 'that request';
  return `I cannot safely complete "${summary}". I can pause here. If you want, I can prepare a request for trusted family help, but only after you explicitly consent.`;
}

function parseUnsupported(utterance: string, ctx: SessionCtx): ParsedCommand | null {
  const text = utterance.trim();
  if (ctx.fields.handoffOffered && CLEAR_CONSENT.test(text)) {
    return {
      kind: 'confirmation',
      patch: {
        familyHelpConsent: true,
        handoffStatus: 'CONSENTED_NOT_SENT',
      },
      reason: 'Explicit elder consent recorded; notification remains a separate governed action.',
    };
  }
  if (ctx.fields.handoffOffered && DECLINE.test(text)) {
    return {
      kind: 'correction',
      patch: {
        familyHelpConsent: false,
        handoffStatus: 'DECLINED',
      },
    };
  }
  if (!text) return null;
  return {
    kind: 'start',
    patch: {
      unsupportedRequest: text,
      limitation: unsupportedGuidance(text),
      handoffOffered: true,
      familyHelpConsent: false,
      handoffStatus: 'AWAITING_CONSENT',
    },
  };
}

function unsupportedReadback(ctx: SessionCtx): string {
  if (ctx.fields.familyHelpConsent === true) {
    return 'You explicitly consented to a trusted-family help request. This skill has recorded consent but has not sent a notification.';
  }
  return String(ctx.fields.limitation || unsupportedGuidance('that request'));
}

function unsupportedScreen(ctx: SessionCtx): ScreenState {
  return {
    skillId: UNSUPPORTED.id,
    step: 'offer_handoff',
    fields: { ...ctx.fields },
    status: ctx.fields.familyHelpConsent === true ? 'handedoff' : 'paused',
  };
}

export const UNSUPPORTED: GovernedTaskSkill = defineSkill({
  id: 'UNSUPPORTED',
  label: 'Unsupported request and human handoff',
  metadata: {
    kind: 'handoff',
    description: 'Explain a limitation and offer trusted-family help with explicit consent.',
    utteranceHints: ['unsupported request', 'ask family for help', 'human help'],
    capabilities: ['explain_limitation', 'offer_family_help', 'record_explicit_consent'],
    externalAction: 'none',
    requiresExplicitConfirmation: false,
    completionLabel: 'HUMAN HELP REQUEST PREPARED',
    disclaimer: 'No family notification is sent without a separate consent-governed notification action.',
    safetyInvariants: ['explicit_family_consent', 'pause_unsupported_task', 'no_implicit_notification'],
  },
  requiredFields: ['unsupportedRequest'],
  steps: [
    { id: 'explain_limitation', prompt: 'I cannot safely complete that request.', field: 'unsupportedRequest' },
    { id: 'offer_handoff', prompt: 'Would you like me to prepare a request for trusted family help?' },
  ],
  safetyRules: [
    {
      id: 'family_consent',
      type: 'readback',
      message: 'Family help requires a clear, explicit elder consent before any notification action.',
    },
  ],
  completionCondition: 'The limitation is explained; family help remains paused unless explicit consent is recorded.',
  complete(ctx) {
    return {
      simulated: false,
      label: ctx.fields.familyHelpConsent === true ? 'HUMAN HELP REQUEST PREPARED' : 'UNSUPPORTED TASK PAUSED',
      summary: unsupportedReadback(ctx),
      disclaimer: UNSUPPORTED.metadata.disclaimer,
    };
  },
  handler: {
    parseCommand: parseUnsupported,
    readback: unsupportedReadback,
    buildScreen: unsupportedScreen,
  },
});
