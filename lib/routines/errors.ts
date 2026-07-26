export type RoutineErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'SAFETY_BLOCK'
  | 'CONSENT_REQUIRED'
  | 'DELIVERY_FAILED';

export class RoutineError extends Error {
  constructor(
    public readonly code: RoutineErrorCode,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = 'RoutineError';
  }
}
