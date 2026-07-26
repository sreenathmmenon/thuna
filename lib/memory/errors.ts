export type MemoryErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONSENT_REQUIRED'
  | 'MEMORY_CORRUPT'
  | 'MEMORY_IO_ERROR';

export class MemoryError extends Error {
  constructor(
    public readonly code: MemoryErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}

export function invalidInput(message: string): MemoryError {
  return new MemoryError('INVALID_INPUT', message, 400);
}

export function notFound(message: string): MemoryError {
  return new MemoryError('NOT_FOUND', message, 404);
}

export function consentRequired(message: string): MemoryError {
  return new MemoryError('CONSENT_REQUIRED', message, 403);
}
