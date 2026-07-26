import type {
  ContinuityChannel,
  ContinuityCheckpoint,
  NextSafeStep,
  PauseReason,
  ResumeDecision,
} from './types';

export function createCheckpoint(input: {
  id: string;
  subjectId: string;
  confirmedFields: Record<string, string | number | boolean>;
  pendingQuestion?: string;
  pauseReason: PauseReason;
  nextSafeStep: NextSafeStep;
  stateRevision: string;
  confirmationRevision?: string;
  originChannel: ContinuityChannel;
  now: Date;
  ttlMs?: number;
}): ContinuityCheckpoint {
  return {
    id: input.id,
    subjectId: input.subjectId,
    confirmedFields: { ...input.confirmedFields },
    pendingQuestion: input.pendingQuestion,
    pauseReason: input.pauseReason,
    nextSafeStep: input.nextSafeStep,
    stateRevision: input.stateRevision,
    confirmationRevision: input.confirmationRevision,
    originChannel: input.originChannel,
    createdAt: input.now.toISOString(),
    expiresAt: new Date(input.now.getTime() + (input.ttlMs ?? 24 * 60 * 60 * 1000)).toISOString(),
  };
}

export function decideResume(input: {
  checkpoint: ContinuityCheckpoint;
  currentRevision: string;
  targetChannel: ContinuityChannel;
  now: Date;
}): ResumeDecision {
  const preserved = { ...input.checkpoint.confirmedFields };
  if (Date.parse(input.checkpoint.expiresAt) <= input.now.getTime()) {
    return {
      resumable: false,
      confirmedFields: preserved,
      pendingQuestion: input.checkpoint.pendingQuestion,
      nextSafeStep: 'ABANDON',
      staleConfirmationInvalidated: Boolean(input.checkpoint.confirmationRevision),
      reason: 'The saved place expired; confirmed fields may seed a fresh start.',
    };
  }

  const channelChanged = input.targetChannel !== input.checkpoint.originChannel;
  const revisionChanged = input.currentRevision !== input.checkpoint.stateRevision;
  const hadConfirmation = Boolean(input.checkpoint.confirmationRevision);
  if (hadConfirmation || revisionChanged || channelChanged) {
    return {
      resumable: true,
      confirmedFields: preserved,
      pendingQuestion: input.checkpoint.pendingQuestion,
      nextSafeStep: 'RE_READ_AND_RECONFIRM',
      staleConfirmationInvalidated: hadConfirmation,
      reason: revisionChanged
        ? 'State changed; a fresh readback and confirmation are required.'
        : channelChanged
          ? 'The channel changed; confirmation must be asked again.'
          : 'Time passed after confirmation; ask again before acting.',
    };
  }

  return {
    resumable: true,
    confirmedFields: preserved,
    pendingQuestion: input.checkpoint.pendingQuestion,
    nextSafeStep: input.checkpoint.pendingQuestion
      ? 'ASK_PENDING_QUESTION'
      : input.checkpoint.nextSafeStep,
    staleConfirmationInvalidated: false,
    reason: 'Confirmed fields and the next safe step were preserved.',
  };
}
