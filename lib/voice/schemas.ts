import { z } from 'next/dist/compiled/zod';

const commandKinds = [
  'start',
  'correction',
  'contextual_question',
  'confirmation',
  'recovery',
  'refuse',
  'unknown',
] as const;

export const parsedCommandSchema = z.object({
  kind: z.enum(commandKinds),
  skillId: z.string().min(1).optional(),
  patch: z.record(z.unknown()).optional(),
  question: z.string().optional(),
  recoveryType: z.enum(['wait', 'repeat_slowly', 'go_back', 'stop']).optional(),
  restorePreference: z.boolean().optional(),
  reason: z.string().optional(),
}).strict();

export const modelCommandSchema = parsedCommandSchema.extend({
  confidence: z.number().min(0).max(1),
}).strict();

export const interpretationRequestSchema = z.object({
  transcript: z.string().trim().min(1).max(5000),
  activeSession: z.record(z.unknown()).default({}),
  currentTaskOrRoutine: z.string().nullable().optional(),
  currentStep: z.union([z.string(), z.number()]).nullable().optional(),
  confirmedFields: z.record(z.unknown()).default({}),
  screenContext: z.record(z.unknown()).default({}),
  allowedActions: z.array(z.enum(commandKinds)).min(1).default([...commandKinds]),
}).strict();

export const speechToTextResponseSchema = z.object({
  transcript: z.string(),
  language_code: z.string().nullable().optional(),
}).passthrough();

export const chatCompletionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string() }).passthrough(),
  }).passthrough()).min(1),
}).passthrough();

export const textToSpeechResponseSchema = z.object({
  audios: z.array(z.string()).min(1),
}).passthrough();

export const translateResponseSchema = z.object({
  translatedText: z.string(),
}).passthrough();

export const ttsRequestSchema = z.object({
  text: z.string().trim().min(1).max(2500),
  language: z.string().min(2).max(20).optional(),
  speaker: z.string().min(1).max(80).optional(),
  pace: z.enum(['normal', 'slow']).default('normal'),
  fallbackId: z.string().regex(/^[a-z0-9_-]+$/i).optional(),
}).strict();
