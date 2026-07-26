import { describe, it, expect } from 'vitest';
import { handle } from '../lib/engine';
import { setPreference, reset, getOrCreate, process } from '../lib/session-store';
import type { SessionState } from '../lib/types';

const SID = 'unit';
const usualOrder = { restaurant: 'Udupi Cafe', items: { name: 'Masala Dosa', includes: ['chutney'], excludes: [] }, address: 'Home' };
function fresh(): SessionState { reset(SID); setPreference(SID, 'usualOrder', usualOrder); return getOrCreate(SID); }

describe('routing', () => {
  it('routes an order request to ORDER_FOOD', () => {
    const r = handle('Order the same dosa as last time, but no chutney.', fresh());
    expect(r.nextCtx.skillId).toBe('ORDER_FOOD');
    expect(r.events.some(e => e.type === 'start_skill')).toBe(true);
  });
  it('routes a payment request to SEND_PAYMENT', () => {
    const r = handle('Send 500 rupees to Priya', fresh());
    expect(r.nextCtx.skillId).toBe('SEND_PAYMENT');
  });
  it('refuses an unsupported request', () => {
    const r = handle('book a flight to mars', fresh());
    expect(r.response.action).toBe('refuse');
  });
});

describe('previous-order restoration', () => {
  it('restores the usual order from preferences', () => {
    const r = handle('Order the same dosa as last time.', fresh());
    expect(r.nextCtx.fields.restaurant).toBe('Udupi Cafe');
    expect((r.nextCtx.fields.items as any).name).toBe('Masala Dosa');
    expect(r.nextCtx.fields.address).toBe('Home');
    expect(r.events.some(e => e.type === 'restore_preference')).toBe(true);
  });
});

describe('contextual question', () => {
  it('answers why total is higher using screen delivery fee', () => {
    fresh();
    process(SID, 'Order the same dosa as last time, but no chutney.');
    const r = handle('Why is the total higher today?', getOrCreate(SID));
    expect(r.response.action).toBe('answer_question');
    expect(r.response.speak).toContain('25');
    expect(r.response.speak).toContain('delivery charge');
  });
});

describe('correction of only one field', () => {
  it('changes only the item; preserves restaurant/address/no-chutney', () => {
    fresh();
    process(SID, 'Order the same dosa as last time, but no chutney.');
    const r = handle('Wait, plain dosa, not masala dosa.', getOrCreate(SID));
    const items = r.nextCtx.fields.items as any;
    expect(items.name).toBe('Plain Dosa');
    expect(r.nextCtx.fields.restaurant).toBe('Udupi Cafe');
    expect(r.nextCtx.fields.address).toBe('Home');
    expect(items.excludes).toContain('chutney');
    expect(r.events.some(e => e.type === 'correction')).toBe(true);
  });
});

describe('confirmation', () => {
  it('completes only on explicit yes; vague never confirms', () => {
    fresh();
    process(SID, 'Order the same dosa as last time, but no chutney.');
    const vague = handle('hmm not sure', getOrCreate(SID));
    expect(vague.nextCtx.awaitingConfirmation).toBe(true);
    expect(vague.response.action).toBe('confirm');
    const yes = handle('Yes.', getOrCreate(SID));
    expect(yes.response.action).toBe('complete');
    expect(yes.response.speak).toContain('SIMULATED ORDER SUCCESS');
    expect(yes.nextScreen.status).toBe('done');
  });
});

describe('OTP/PIN/CVV refusal', () => {
  it('refuses OTP before any processing', () => {
    const r = handle('Can I tell you my OTP?', fresh());
    expect(r.response.action).toBe('refuse');
    expect(r.response.speak).toContain('OTP');
    expect(r.events.some(e => e.type === 'refuse_credential')).toBe(true);
  });
  it('refuses PIN', () => { expect(handle('here is my pin 1234', fresh()).response.action).toBe('refuse'); });
  it('refuses CVV', () => { expect(handle('my cvv is 321', fresh()).response.action).toBe('refuse'); });
});

describe('recovery: wait/repeat/back/stop', () => {
  it('wait pauses', () => {
    fresh(); process(SID, 'Order the same dosa as last time, but no chutney.');
    const r = handle('wait', getOrCreate(SID));
    expect(r.response.action).toBe('handoff'); expect(r.nextScreen.status).toBe('paused');
  });
  it('repeat slowly sets slow pace', () => {
    fresh(); process(SID, 'Order the same dosa as last time, but no chutney.');
    const r = handle('repeat slowly', getOrCreate(SID));
    expect(r.response.action).toBe('repeat_slowly'); expect(r.nextCtx.pace).toBe('slow');
  });
  it('go back decrements step', () => {
    const start = handle('Order the same dosa as last time, but no chutney.', fresh());
    const r = handle('go back', { ctx: start.nextCtx, history: [], screen: start.nextScreen });
    expect(r.response.action).toBe('go_back');
  });
  it('stop hands off', () => {
    fresh(); process(SID, 'Order the same dosa as last time, but no chutney.');
    const r = handle('stop', getOrCreate(SID));
    expect(r.response.action).toBe('handoff'); expect(r.nextScreen.status).toBe('handedoff');
  });
});
