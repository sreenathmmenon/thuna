import type { GovernedTaskSkill } from './contract';
import { GENERAL_HELP } from './general-help';
import { ORDER_FOOD } from './order-food';
import { PHONE_HELP } from './phone-help';
import { SEND_PAYMENT } from './send-payment';
import { TRACK_ORDER } from './track-order';
import { UNSUPPORTED } from './unsupported';

const SKILLS = [
  ORDER_FOOD,
  SEND_PAYMENT,
  PHONE_HELP,
  TRACK_ORDER,
  GENERAL_HELP,
  UNSUPPORTED,
] satisfies GovernedTaskSkill[];

const REGISTRY: Readonly<Record<string, GovernedTaskSkill>> = Object.freeze(
  Object.fromEntries(SKILLS.map((skill) => [skill.id, skill])),
);

export function getSkill(id: string): GovernedTaskSkill | undefined { return REGISTRY[id]; }
export function listSkills(): GovernedTaskSkill[] { return [...SKILLS]; }
export function allSkillIds(): string[] { return Object.keys(REGISTRY); }
