import type { SessionCtx, TaskSkill } from '../types';

export type SkillKind = 'transaction' | 'guided_help' | 'information' | 'handoff';
export type ExternalActionMode = 'none' | 'simulated';

export interface GovernedSkillMetadata {
  kind: SkillKind;
  description: string;
  utteranceHints: string[];
  capabilities: string[];
  externalAction: ExternalActionMode;
  requiresExplicitConfirmation: boolean;
  completionLabel: string;
  disclaimer: string;
  safetyInvariants: string[];
}

export interface GovernedCompletion {
  simulated: boolean;
  label: string;
  summary: string;
  disclaimer: string;
}

/**
 * Common contract for registry-loaded task skills.
 *
 * The engine owns transitions. Skills only parse a proposed field patch, render
 * governed guidance/read-back, and describe a completion for the engine to
 * approve after its confirmation gate.
 */
export interface GovernedTaskSkill extends TaskSkill {
  metadata: GovernedSkillMetadata;
  complete(ctx: SessionCtx): GovernedCompletion;
}

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`Duplicate ${label} in governed skill definition`);
  }
}

export function defineSkill<T extends GovernedTaskSkill>(skill: T): T {
  if (!/^[A-Z][A-Z0-9_]*$/.test(skill.id)) {
    throw new Error(`Invalid governed skill id: ${skill.id}`);
  }
  if (skill.metadata.externalAction === 'simulated' && !/simulat/i.test(skill.metadata.disclaimer)) {
    throw new Error(`${skill.id} must clearly disclose its simulated external action`);
  }
  if (skill.metadata.requiresExplicitConfirmation && !skill.steps.some((step) => step.confirmBefore)) {
    throw new Error(`${skill.id} requires an explicit confirmation step`);
  }
  assertUnique(skill.steps.map((step) => step.id), `${skill.id} step id`);
  assertUnique(skill.safetyRules.map((rule) => rule.id), `${skill.id} safety rule id`);
  return Object.freeze(skill);
}
