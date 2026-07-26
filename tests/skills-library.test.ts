import { describe, expect, it } from 'vitest';
import { isConfirmation } from '../lib/command-parser';
import type { ParsedCommand, SessionCtx } from '../lib/types';
import { GENERAL_HELP, GENERAL_HELP_TOPICS, detectGeneralHelpTopic, explainGeneralHelp } from '../lib/skills/general-help';
import { ORDER_FOOD } from '../lib/skills/order-food';
import {
  PHONE_GUIDES,
  PHONE_HELP,
  detectPhoneGoal,
  phoneInstruction,
  updatePhoneGuidance,
} from '../lib/skills/phone-help';
import { allSkillIds, getSkill, listSkills } from '../lib/skills/registry';
import { PAYMENT_RECIPIENTS, SEND_PAYMENT, resolvePaymentRecipient } from '../lib/skills/send-payment';
import { DEMO_TRACKING, TRACK_ORDER, lookupTracking } from '../lib/skills/track-order';
import { UNSUPPORTED, unsupportedGuidance } from '../lib/skills/unsupported';

function context(fields: Record<string, unknown> = {}, preferences: Record<string, unknown> = {}): SessionCtx {
  return {
    skillId: undefined,
    stepIndex: 0,
    fields,
    correctionHistory: [],
    pace: 'normal',
    preferences,
    awaitingConfirmation: false,
  };
}

function parse(skill: typeof SEND_PAYMENT, utterance: string, ctx: SessionCtx): ParsedCommand {
  const parsed = skill.handler?.parseCommand?.(utterance, ctx);
  expect(parsed).not.toBeNull();
  return parsed as ParsedCommand;
}

describe('governed skill registry', () => {
  it('registers every skill through the common metadata contract', () => {
    expect(allSkillIds()).toEqual([
      'ORDER_FOOD',
      'SEND_PAYMENT',
      'PHONE_HELP',
      'TRACK_ORDER',
      'GENERAL_HELP',
      'UNSUPPORTED',
    ]);
    for (const skill of listSkills()) {
      expect(getSkill(skill.id)).toBe(skill);
      expect(skill.metadata.description.length).toBeGreaterThan(0);
      expect(skill.metadata.capabilities.length).toBeGreaterThan(0);
      expect(skill.metadata.safetyInvariants.length).toBeGreaterThan(0);
      expect(typeof skill.complete).toBe('function');
      if (skill.metadata.externalAction === 'simulated') {
        expect(skill.metadata.disclaimer).toMatch(/simulat/i);
      }
      if (skill.metadata.requiresExplicitConfirmation) {
        expect(skill.steps.some((step) => step.confirmBefore)).toBe(true);
      }
    }
  });

  it('preserves the working ORDER_FOOD preference restoration and simulation label', () => {
    const usualOrder = {
      restaurant: 'Udupi Cafe',
      items: { name: 'Masala Dosa', includes: ['chutney'], excludes: [] },
      address: 'Home',
    };
    const restored = ORDER_FOOD.handler?.restorePreference?.(context({}, { usualOrder }));
    expect(restored).toEqual(usualOrder);
    const completion = ORDER_FOOD.complete(context(restored ?? {}));
    expect(completion.label).toBe('SIMULATED ORDER SUCCESS');
    expect(completion.disclaimer).toContain('no real order');
  });
});

describe('SEND_PAYMENT', () => {
  it('contains the three governed Priya recipient records', () => {
    expect(PAYMENT_RECIPIENTS.map((recipient) => recipient.name)).toEqual([
      'Priya Menon',
      'Priya Stores',
      'Priya Nair',
    ]);
  });

  it('blocks ambiguous and semantically wrong recipients', () => {
    const ambiguous = resolvePaymentRecipient('Send Rs 500 to Priya');
    expect(ambiguous.recipient).toBeNull();
    expect(ambiguous.candidates).toHaveLength(3);
    expect(ambiguous.warning).toContain('full name');

    const mismatch = resolvePaymentRecipient('Send Rs 500 to Priya Stores, my daughter');
    expect(mismatch.recipient).toBeNull();
    expect(mismatch.warning).toContain('store');
    expect(mismatch.warning).toContain('person');
  });

  it('corrects only the affected recipient or amount', () => {
    const existing = context({ recipient: 'Priya Menon', recipientId: 'priya-menon', amount: 500 });
    const amountCorrection = parse(SEND_PAYMENT, 'Actually, make it Rs 750', existing);
    expect(amountCorrection.patch).toEqual({ amount: 750 });
    expect({ ...existing.fields, ...amountCorrection.patch }).toMatchObject({
      recipient: 'Priya Menon',
      recipientId: 'priya-menon',
      amount: 750,
    });

    const recipientCorrection = parse(SEND_PAYMENT, 'No, send it to Priya Nair', existing);
    expect(recipientCorrection.patch).toMatchObject({ recipient: 'Priya Nair', recipientId: 'priya-nair' });
    expect(recipientCorrection.patch).not.toHaveProperty('amount');
    expect({ ...existing.fields, ...recipientCorrection.patch }).toMatchObject({
      recipient: 'Priya Nair',
      amount: 500,
    });
  });

  it('requires explicit confirmation and produces a simulated payment receipt', () => {
    expect(SEND_PAYMENT.metadata.requiresExplicitConfirmation).toBe(true);
    expect(isConfirmation('yes')).toBe(true);
    expect(isConfirmation('wait')).toBe(false);
    expect(isConfirmation('hmm not sure')).toBe(false);

    const ctx = context({ recipient: 'Priya Menon', amount: 500 });
    const readback = SEND_PAYMENT.handler?.readback?.(ctx);
    expect(readback).toContain('Rs 500');
    expect(readback).toContain('Priya Menon');
    const completion = SEND_PAYMENT.complete(ctx);
    expect(completion.label).toBe('SIMULATED PAYMENT SUCCESS');
    expect(completion.disclaimer).toContain('no real money');
  });

  it('keeps credential refusal structural in the skill definition', () => {
    const credentialRule = SEND_PAYMENT.safetyRules.find((rule) => rule.id === 'no_credential');
    expect(credentialRule?.type).toBe('refuse_pattern');
    expect(credentialRule?.pattern).toMatch(/otp/);
    expect(SEND_PAYMENT.safetyRules.some((rule) => rule.type === 'mismatch_check')).toBe(true);
    expect(SEND_PAYMENT.safetyRules.some((rule) => rule.type === 'readback')).toBe(true);
  });
});

describe('PHONE_HELP', () => {
  it.each([
    ['Please make the text bigger', 'increase_text_size'],
    ['Help me connect Wi-Fi', 'connect_wifi'],
    ['How do I send a photo?', 'send_photo'],
  ] as const)('detects %s', (utterance, expected) => {
    expect(detectPhoneGoal(utterance)).toBe(expected);
  });

  it('provides exactly one instruction and supports repeat, back, wait, and stop', () => {
    const goal = 'connect_wifi' as const;
    expect(phoneInstruction(goal, 0)).toBe(PHONE_GUIDES[goal].instructions[0]);
    expect(phoneInstruction(goal, 0)).not.toContain(PHONE_GUIDES[goal].instructions[1]);

    const next = updatePhoneGuidance(goal, 0, 'next');
    expect(next.instructionIndex).toBe(1);
    expect(updatePhoneGuidance(goal, 1, 'repeat').instructionIndex).toBe(1);
    expect(updatePhoneGuidance(goal, 1, 'back').instructionIndex).toBe(0);
    expect(updatePhoneGuidance(goal, 1, 'wait').instruction).toContain('Paused');
    expect(updatePhoneGuidance(goal, 1, 'stop')).toMatchObject({ stopped: true, complete: false });
  });

  it('labels phone guidance as simulated and never claims phone control', () => {
    const ctx = context({
      goal: 'increase_text_size',
      instructionIndex: 0,
    });
    const readback = PHONE_HELP.handler?.readback?.(ctx);
    expect(readback).toContain('simulated guidance');
    expect(readback).toContain('does not control your phone');
    expect(PHONE_HELP.metadata.requiresExplicitConfirmation).toBe(false);
  });
});

describe('TRACK_ORDER', () => {
  it('supports all four governed tracking states', () => {
    expect(new Set(Object.values(DEMO_TRACKING))).toEqual(
      new Set(['PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELAYED']),
    );
    for (const reference of Object.keys(DEMO_TRACKING)) {
      const snapshot = lookupTracking(reference);
      expect(snapshot).not.toBeNull();
      expect(snapshot?.guidance).not.toMatch(/\bwill arrive\b|\bguaranteed\b|\bby \d{1,2}[:.]\d{2}\b/i);
    }
  });

  it('does not invent a promise for an unknown reference', () => {
    expect(lookupTracking('THUNA-9999')).toBeNull();
    const readback = TRACK_ORDER.handler?.readback?.(context({ orderReference: 'THUNA-9999' }));
    expect(readback).toContain('do not have a verified status');
    expect(readback).toContain('will not invent');
  });
});

describe('GENERAL_HELP', () => {
  it.each([
    ['What is UPI?', 'upi'],
    ['What is a CVV?', 'cvv'],
    ['Explain airplane mode', 'airplane_mode'],
    ['Why is my payment pending?', 'payment_pending'],
    ['What is location permission?', 'location_permission'],
    ['Explain a QR code', 'qr_code'],
  ] as const)('explains %s', (utterance, expectedTopic) => {
    const topic = detectGeneralHelpTopic(utterance);
    expect(topic).toBe(expectedTopic);
    const explanation = explainGeneralHelp(expectedTopic);
    expect(explanation).toContain(GENERAL_HELP_TOPICS[expectedTopic].explanation);
    expect(explanation).toContain('does not control an external app');
  });

  it('never claims control of an external app', () => {
    const completion = GENERAL_HELP.complete(context({ topic: 'qr_code' }));
    expect(completion.simulated).toBe(false);
    expect(completion.summary).toContain('does not control an external app');
  });
});

describe('UNSUPPORTED and human handoff', () => {
  it('explains the limitation and offers family help without implicit consent', () => {
    const initial = parse(UNSUPPORTED, 'Book a flight for me', context());
    expect(initial.patch).toMatchObject({
      handoffOffered: true,
      familyHelpConsent: false,
      handoffStatus: 'AWAITING_CONSENT',
    });
    expect(unsupportedGuidance('Book a flight for me')).toContain('explicitly consent');
  });

  it('records consent only after the handoff was offered and never claims notification', () => {
    const prematureYes = parse(UNSUPPORTED, 'yes', context());
    expect(prematureYes.patch?.familyHelpConsent).toBe(false);

    const offered = context({ handoffOffered: true, familyHelpConsent: false });
    const consent = parse(UNSUPPORTED, 'Yes, please ask my family', offered);
    expect(consent.patch).toMatchObject({
      familyHelpConsent: true,
      handoffStatus: 'CONSENTED_NOT_SENT',
    });

    const completion = UNSUPPORTED.complete(context({
      handoffOffered: true,
      familyHelpConsent: true,
    }));
    expect(completion.summary).toContain('has not sent a notification');
    expect(completion.disclaimer).toContain('No family notification is sent');
  });
});
