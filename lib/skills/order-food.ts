import type { SessionCtx, ParsedCommand } from '../types';
import { defineSkill, type GovernedTaskSkill } from './contract';

// A food order: item name + included customisations + explicitly-excluded customisations.
export interface FoodOrder { name: string; includes: string[]; excludes: string[]; }

const PRICES: Record<string, number> = { 'masala dosa': 120, 'plain dosa': 100, 'paper dosa': 90, 'set dosa': 110 };
const DELIVERY_FEE = 25;
const KNOWN_CUST = ['chutney', 'sambar', 'chilli'];

function orderOf(ctx: SessionCtx): FoodOrder {
  const it = ctx.fields.items as FoodOrder | undefined;
  return it ? { name: it.name || '', includes: [...(it.includes || [])], excludes: [...(it.excludes || [])] } : { name: '', includes: [], excludes: [] };
}
function priceOf(name: string): number { return PRICES[name.toLowerCase()] ?? 100; }

export const ORDER_FOOD: GovernedTaskSkill = defineSkill({
  id: 'ORDER_FOOD',
  label: 'Order food',
  metadata: {
    kind: 'transaction',
    description: 'Restore, correct, read back, and simulate a food order.',
    utteranceHints: ['order food', 'usual dosa', 'restaurant'],
    capabilities: ['restore_previous_order', 'correct_order', 'explain_total'],
    externalAction: 'simulated',
    requiresExplicitConfirmation: true,
    completionLabel: 'SIMULATED ORDER SUCCESS',
    disclaimer: 'This is a simulated result — no real order was placed.',
    safetyInvariants: ['credential_refusal', 'readback_before_action', 'correction_invalidates_confirmation'],
  },
  requiredFields: ['restaurant', 'items', 'address'],
  steps: [
    { id: 'ask_item', prompt: 'What would you like to order today?', field: 'items' },
    { id: 'ask_restaurant', prompt: 'From which restaurant?', field: 'restaurant' },
    { id: 'confirm_address', prompt: 'Is the delivery address still the usual one?', field: 'address' },
    { id: 'readback', prompt: 'Let me read back your order before we place it.', confirmBefore: true },
    { id: 'place', prompt: 'Placing the order now.' },
  ],
  safetyRules: [
    { id: 'readback_total', type: 'readback', message: 'I will read back the item and total before placing the order.' },
    { id: 'no_credential', type: 'refuse_pattern', pattern: 'otp|pin|cvv|card number|password', message: 'I will never ask for or accept an OTP, PIN, CVV, or password.' },
  ],
  completionCondition: 'Order placed with confirmed item, total, and address.',
  complete(ctx) {
    return {
      simulated: true,
      label: 'SIMULATED ORDER SUCCESS',
      summary: ORDER_FOOD.handler?.readback?.(ctx) ?? 'Simulated food order',
      disclaimer: ORDER_FOOD.metadata.disclaimer,
    };
  },
  handler: {
    restorePreference(ctx) {
      const usual = ctx.preferences.usualOrder as { restaurant: string; items: FoodOrder; address: string } | undefined;
      if (!usual) return null;
      return {
        restaurant: usual.restaurant,
        items: { name: usual.items.name, includes: [...usual.items.includes], excludes: [...usual.items.excludes] },
        address: usual.address,
      };
    },
    parseCommand(utterance, ctx): ParsedCommand | null {
      const t = ' ' + utterance.toLowerCase() + ' ';
      const restore = /(same as last|last time|my usual|as before|previous order|usual order)/.test(t);
      const order = orderOf(ctx);
      let changed = false;

      // item name change
      if (/(not masala|instead of masala)/.test(t) || /plain dosa/.test(t)) { order.name = 'Plain Dosa'; changed = true; }
      else if (/masala dosa/.test(t)) { order.name = 'Masala Dosa'; changed = true; }
      else if (/(paper dosa)/.test(t)) { order.name = 'Paper Dosa'; changed = true; }
      else if (/(set dosa)/.test(t)) { order.name = 'Set Dosa'; changed = true; }
      else if (/(\bdosa\b)/.test(t) && !order.name) { order.name = 'Masala Dosa'; changed = true; }

      // customisations: "no chutney" → exclude; "extra sambar" → include
      const noX = [...t.matchAll(/\bno (\w+)/g)].map(m => m[1]).filter(x => KNOWN_CUST.includes(x));
      const extraX = [...t.matchAll(/\b(extra|add|with) (\w+)/g)].map(m => m[2]).filter(x => KNOWN_CUST.includes(x));
      for (const x of noX) { order.includes = order.includes.filter(c => c !== x); if (!order.excludes.includes(x)) order.excludes.push(x); changed = true; }
      for (const x of extraX) { if (!order.includes.includes(x)) order.includes.push(x); order.excludes = order.excludes.filter(c => c !== x); changed = true; }

      if (!changed && !restore) return null;
      const patch: Record<string, unknown> = {};
      if (changed) patch.items = order;
      return { kind: restore ? 'start' : 'correction', restorePreference: restore, patch: changed ? patch : undefined };
    },
    answerContextual(question, ctx, screen) {
      const q = question.toLowerCase();
      if (/(total|higher|expensive|cost|charge|fee|why.*more|why.*higher)/.test(q)) {
        const fee = screen.deliveryFee ?? DELIVERY_FEE;
        if (fee > 0) return `The food price is the same, but today there is a Rs ${fee} delivery charge because the restaurant is farther away. We can go back and look for a closer restaurant.`;
      }
      return null;
    },
    readback(ctx) {
      const o = orderOf(ctx);
      let s = o.name || 'your order';
      if (o.includes.length) s += `, with ${o.includes.join(', ')}`;
      if (o.excludes.length) s += `, no ${o.excludes.join(', no ')}`;
      s += ` from ${ctx.fields.restaurant || 'the restaurant'}`;
      s += `, to ${ctx.fields.address || 'your address'}`;
      const total = priceOf(o.name) + DELIVERY_FEE;
      s += `. Total: Rs ${total}`;
      return s;
    },
    buildScreen(ctx) {
      const step = ORDER_FOOD.steps[ctx.stepIndex];
      const o = orderOf(ctx);
      return {
        skillId: ORDER_FOOD.id,
        step: step?.id,
        fields: { ...ctx.fields },
        deliveryFee: DELIVERY_FEE,
        total: priceOf(o.name) + DELIVERY_FEE,
        status: ctx.awaitingConfirmation ? 'awaiting_confirmation' : 'idle',
      };
    },
  },
});
