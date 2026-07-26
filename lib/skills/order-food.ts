import type { TaskSkill } from '../types';
export const ORDER_FOOD: TaskSkill = {
  id: 'ORDER_FOOD',
  label: 'Order food',
  requiredFields: ['restaurant', 'items', 'address', 'total'],
  steps: [
    { id: 'ask_item', prompt: 'What would you like to order today?', field: 'items' },
    { id: 'ask_restaurant', prompt: 'From which restaurant?', field: 'restaurant' },
    { id: 'confirm_address', prompt: 'Is the delivery address still the usual one?', field: 'address' },
    { id: 'readback', prompt: 'Let me read back your order before we place it.', confirmBefore: true },
    { id: 'place', prompt: 'Placing the order now.' },
  ],
  safetyRules: [
    { id: 'readback_total', type: 'readback', message: 'I will read back the item and total before placing the order.' },
    { id: 'no_credential', type: 'refuse_pattern', pattern: 'otp|pin|cvv|card number|password', message: 'I will never ask for or accept an OTP, PIN, CVV, or password. Please never share those.' },
  ],
  completionCondition: 'Order placed with confirmed item, total, and address.',
};
