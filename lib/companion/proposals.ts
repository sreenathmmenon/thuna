import { randomUUID } from 'node:crypto';
import type { ReminderPlan } from './reminder-planner';

interface ReminderProposal {
  plan: ReminderPlan;
  expiresAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  __thunaReminderProposals?: Map<string, ReminderProposal>;
};

const proposals =
  globalStore.__thunaReminderProposals ?? new Map<string, ReminderProposal>();
globalStore.__thunaReminderProposals = proposals;

export function createReminderProposal(plan: ReminderPlan): string {
  const now = Date.now();
  for (const [id, proposal] of proposals) {
    if (proposal.expiresAt <= now) proposals.delete(id);
  }
  const id = randomUUID();
  proposals.set(id, { plan, expiresAt: now + 10 * 60_000 });
  return id;
}

export function consumeReminderProposal(id: string): ReminderPlan {
  const proposal = proposals.get(id);
  proposals.delete(id);
  if (!proposal || proposal.expiresAt <= Date.now()) {
    throw new Error('That reminder confirmation expired. Please review it again.');
  }
  return proposal.plan;
}
