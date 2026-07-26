import { describe, it, expect } from 'vitest';
import { reset, setPreference, process, getOrCreate, getHistory } from '../lib/session-store';

const SID = 'm2';
const usualOrder = { restaurant: 'Udupi Cafe', items: { name: 'Masala Dosa', includes: ['chutney'], excludes: [] }, address: 'Home' };

describe('M2 — typed end-to-end workflow', () => {
  it('runs the full 10-step flow', () => {
    reset(SID); setPreference(SID, 'usualOrder', usualOrder);
    const out: string[] = [];

    let r = process(SID, 'Order the same dosa as last time, but no chutney.');
    out.push(`1: ${r.response.speak}`);
    expect((r.nextCtx.fields.items as any).excludes).toContain('chutney');
    expect(r.nextCtx.fields.restaurant).toBe('Udupi Cafe');
    expect(r.nextCtx.fields.address).toBe('Home');
    expect(r.nextCtx.awaitingConfirmation).toBe(true);

    r = process(SID, 'Why is the total higher today?');
    out.push(`2: ${r.response.speak}`);
    expect(r.response.speak).toContain('25');
    expect(r.response.speak).toContain('delivery charge');

    r = process(SID, 'Wait, plain dosa, not masala dosa.');
    out.push(`4: ${r.response.speak}`);
    const items = r.nextCtx.fields.items as any;
    expect(items.name).toBe('Plain Dosa');
    expect(r.nextCtx.fields.restaurant).toBe('Udupi Cafe');
    expect(r.nextCtx.fields.address).toBe('Home');
    expect(items.excludes).toContain('chutney');
    expect(r.nextCtx.awaitingConfirmation).toBe(true);
    expect(r.response.speak).toContain('Plain Dosa');
    expect(r.response.speak).toContain('no chutney');
    expect(r.response.speak).toContain('Udupi Cafe');
    expect(r.response.speak).toContain('yes');

    r = process(SID, 'Yes.');
    out.push(`9: ${r.response.speak}`);
    expect(r.response.action).toBe('complete');
    expect(r.response.speak).toContain('SIMULATED ORDER SUCCESS');
    expect(r.nextScreen.status).toBe('done');

    const h = getHistory(SID);
    expect(h.some(e => e.type === 'start_skill')).toBe(true);
    expect(h.some(e => e.type === 'restore_preference')).toBe(true);
    expect(h.some(e => e.type === 'contextual_question')).toBe(true);
    expect(h.some(e => e.type === 'correction')).toBe(true);
    expect(h.some(e => e.type === 'confirmation')).toBe(true);
    expect(h.some(e => e.type === 'complete')).toBe(true);

    console.log('\n===== M2 10-STEP OUTPUTS =====\n' + out.join('\n') + '\n==============================');
  });
});
