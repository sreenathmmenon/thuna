import { handle } from '../engine';
import { synthesizeSpeech, transcribeAudio } from '../sarvam';
import type { EngineResult, SessionState } from '../types';
import { interpretTranscript, type InterpretationResult } from './interpret';

export interface VoicePipelineResult {
  transcript: string;
  languageCode: string | null;
  command: InterpretationResult;
  engine: EngineResult;
  audio: Uint8Array;
  audioContentType: 'audio/wav';
}

/**
 * Stateless end-to-end helper. The caller remains responsible for committing
 * engine.nextCtx/nextScreen through the existing session store.
 */
export async function runVoicePipeline(audio: Blob, state: SessionState): Promise<VoicePipelineResult> {
  const transcript = await transcribeAudio(audio);
  const command = await interpretTranscript({
    transcript: transcript.transcript,
    activeSession: { ctx: state.ctx },
    currentTaskOrRoutine: state.ctx.skillId,
    currentStep: state.ctx.stepIndex,
    confirmedFields: state.ctx.fields,
    screenContext: state.screen as unknown as Record<string, unknown>,
    allowedActions: [
      'start',
      'correction',
      'contextual_question',
      'confirmation',
      'recovery',
      'refuse',
      'unknown',
    ],
  });
  const engine = handle(transcript.transcript, state);
  const speech = await synthesizeSpeech(engine.response.speak || 'Please try again.', { pace: engine.nextCtx.pace });
  return {
    transcript: transcript.transcript,
    languageCode: transcript.language_code,
    command,
    engine,
    audio: speech.audio,
    audioContentType: speech.contentType,
  };
}
