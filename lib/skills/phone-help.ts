import type { ParsedCommand, ScreenState, SessionCtx } from '../types';
import { defineSkill, type GovernedTaskSkill } from './contract';

export type PhoneHelpGoal = 'increase_text_size' | 'connect_wifi' | 'send_photo';

export interface PhoneGuidance {
  goal: PhoneHelpGoal;
  label: string;
  instructions: readonly string[];
}

export const PHONE_GUIDES: Record<PhoneHelpGoal, PhoneGuidance> = {
  increase_text_size: {
    goal: 'increase_text_size',
    label: 'Increase text size',
    instructions: [
      'Open Settings on your phone.',
      'Tap Display, or Display and brightness.',
      'Tap Text size or Font size.',
      'Move the slider to the right, then stop when the letters feel comfortable.',
    ],
  },
  connect_wifi: {
    goal: 'connect_wifi',
    label: 'Connect Wi-Fi',
    instructions: [
      'Open Settings on your phone.',
      'Tap Wi-Fi, Network, or Connections.',
      'Make sure Wi-Fi is switched on.',
      'Tap the name of the network you trust.',
      'Enter its password on your phone. Do not tell the password to Thuna.',
    ],
  },
  send_photo: {
    goal: 'send_photo',
    label: 'Send a photo',
    instructions: [
      'Open the messaging app you want to use.',
      'Open the conversation with the intended person.',
      'Tap the attachment or photo button.',
      'Select one photo.',
      'Check both the photo and the recipient before you tap Send.',
    ],
  },
};

export function detectPhoneGoal(text: string): PhoneHelpGoal | null {
  if (/(text|font|letters?).*(bigger|larger|increase|size)|increase.*(text|font)|large.*(text|font)/i.test(text)) {
    return 'increase_text_size';
  }
  if (/(wi[\s-]?fi|wireless|internet network|connect.*network)/i.test(text)) return 'connect_wifi';
  if (/(send|share).*(photo|picture|image)|(photo|picture|image).*(send|share)/i.test(text)) return 'send_photo';
  return null;
}

export function phoneInstruction(goal: PhoneHelpGoal, index: number): string {
  const guide = PHONE_GUIDES[goal];
  const safeIndex = Math.min(Math.max(0, index), guide.instructions.length - 1);
  return guide.instructions[safeIndex];
}

export interface PhoneGuidanceUpdate {
  instructionIndex: number;
  instruction: string;
  complete: boolean;
  stopped: boolean;
}

export function updatePhoneGuidance(
  goal: PhoneHelpGoal,
  currentIndex: number,
  command: 'next' | 'repeat' | 'back' | 'wait' | 'stop',
): PhoneGuidanceUpdate {
  const lastIndex = PHONE_GUIDES[goal].instructions.length - 1;
  if (command === 'stop') {
    return { instructionIndex: currentIndex, instruction: 'Stopped. No phone setting was changed by Thuna.', complete: false, stopped: true };
  }
  if (command === 'wait') {
    return { instructionIndex: currentIndex, instruction: 'Paused. Take your time.', complete: false, stopped: false };
  }
  const instructionIndex =
    command === 'next' ? Math.min(lastIndex, currentIndex + 1) :
      command === 'back' ? Math.max(0, currentIndex - 1) :
        Math.min(lastIndex, Math.max(0, currentIndex));
  return {
    instructionIndex,
    instruction: phoneInstruction(goal, instructionIndex),
    complete: command === 'next' && currentIndex >= lastIndex,
    stopped: false,
  };
}

function parsePhoneCommand(utterance: string, ctx: SessionCtx): ParsedCommand | null {
  const goal = detectPhoneGoal(utterance);
  if (goal) {
    return {
      kind: ctx.fields.goal ? 'correction' : 'start',
      patch: {
        goal,
        goalLabel: PHONE_GUIDES[goal].label,
        instructionIndex: 0,
        currentInstruction: phoneInstruction(goal, 0),
        guidanceSimulated: true,
      },
    };
  }

  const activeGoal = ctx.fields.goal as PhoneHelpGoal | undefined;
  if (!activeGoal || !PHONE_GUIDES[activeGoal]) return null;
  if (!/^(next|continue|ready|done with that|i did it)\b/i.test(utterance.trim())) return null;
  const currentIndex = Number(ctx.fields.instructionIndex ?? 0);
  const update = updatePhoneGuidance(activeGoal, currentIndex, 'next');
  return {
    kind: 'correction',
    patch: {
      instructionIndex: update.instructionIndex,
      currentInstruction: update.instruction,
      guidanceComplete: update.complete,
    },
  };
}

function phoneReadback(ctx: SessionCtx): string {
  const goal = ctx.fields.goal as PhoneHelpGoal | undefined;
  if (!goal || !PHONE_GUIDES[goal]) return 'Choose text size, Wi-Fi, or sending a photo.';
  const index = Number(ctx.fields.instructionIndex ?? 0);
  return `${PHONE_GUIDES[goal].label}: ${phoneInstruction(goal, index)} This is simulated guidance; Thuna does not control your phone.`;
}

function phoneScreen(ctx: SessionCtx): ScreenState {
  return {
    skillId: PHONE_HELP.id,
    step: 'guide_one_step',
    fields: { ...ctx.fields },
    status: ctx.awaitingConfirmation ? 'awaiting_confirmation' : 'idle',
  };
}

export const PHONE_HELP: GovernedTaskSkill = defineSkill({
  id: 'PHONE_HELP',
  label: 'Phone help',
  metadata: {
    kind: 'guided_help',
    description: 'Give one simulated phone instruction at a time.',
    utteranceHints: ['make text bigger', 'connect Wi-Fi', 'send a photo'],
    capabilities: ['increase_text_size', 'connect_wifi', 'send_photo', 'repeat_back_wait_stop'],
    externalAction: 'none',
    requiresExplicitConfirmation: false,
    completionLabel: 'PHONE GUIDANCE COMPLETE',
    disclaimer: 'This is simulated guidance — Thuna does not control or change the phone.',
    safetyInvariants: ['one_instruction_at_a_time', 'no_destructive_reset', 'no_external_app_control_claim'],
  },
  requiredFields: ['goal'],
  steps: [
    { id: 'identify_goal', prompt: 'Would you like help with text size, Wi-Fi, or sending a photo?', field: 'goal' },
    { id: 'guide_one_step', prompt: 'I will show one instruction at a time. Say next, repeat, back, wait, or stop.' },
  ],
  safetyRules: [
    {
      id: 'no_destructive',
      type: 'refuse_pattern',
      pattern: 'reset|erase|delete|factory|format',
      message: 'I will not guide a destructive reset, erase, delete, or format action.',
    },
    {
      id: 'one_step',
      type: 'readback',
      message: 'Only one instruction is presented at a time.',
    },
  ],
  completionCondition: 'The elder says the guided task is complete or stops; Thuna never claims it changed the phone.',
  complete(ctx) {
    return {
      simulated: false,
      label: 'PHONE GUIDANCE COMPLETE',
      summary: phoneReadback(ctx),
      disclaimer: PHONE_HELP.metadata.disclaimer,
    };
  },
  handler: {
    parseCommand: parsePhoneCommand,
    readback: phoneReadback,
    buildScreen: phoneScreen,
  },
});
