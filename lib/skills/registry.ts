import type { TaskSkill } from '../types';
import { ORDER_FOOD } from './order-food';
import { PHONE_HELP } from './phone-help';
import { SEND_PAYMENT } from './send-payment';
const REGISTRY: Record<string, TaskSkill> = { ORDER_FOOD, PHONE_HELP, SEND_PAYMENT };
export function getSkill(id: string): TaskSkill | undefined { return REGISTRY[id]; }
export function listSkills(): TaskSkill[] { return Object.values(REGISTRY); }
export function allSkillIds(): string[] { return Object.keys(REGISTRY); }
