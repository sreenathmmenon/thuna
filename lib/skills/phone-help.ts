import type { TaskSkill } from '../types';
export const PHONE_HELP: TaskSkill = {
  id: 'PHONE_HELP',
  label: 'Phone help',
  requiredFields: ['goal'],
  steps: [
    { id: 'identify_goal', prompt: 'What would you like to change on your phone?', field: 'goal' },
    { id: 'guide_step', prompt: 'I will guide you one step at a time. Tell me when you are ready for the next step.' },
  ],
  safetyRules: [
    { id: 'no_destructive', type: 'refuse_pattern', pattern: 'reset|erase|delete|factory|format', message: 'I will not guide destructive settings without confirming first.' },
  ],
  completionCondition: 'Setting changed with one-step guidance and confirmation.',
};
