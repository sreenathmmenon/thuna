export class ContinuityError extends Error {
  constructor(
    readonly code:
      | 'INVALID_INPUT'
      | 'NOT_FOUND'
      | 'INVALID_TRANSITION'
      | 'CONFIRMATION_REQUIRED'
      | 'CONSENT_REQUIRED',
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
