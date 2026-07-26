export type VoiceErrorCode =
  | 'INVALID_REQUEST'
  | 'EMPTY_AUDIO'
  | 'AUDIO_TOO_LARGE'
  | 'EMPTY_TEXT'
  | 'TEXT_TOO_LONG'
  | 'MISSING_CREDENTIAL'
  | 'UPSTREAM_ERROR'
  | 'INVALID_UPSTREAM_RESPONSE';

export class SarvamError extends Error {
  constructor(
    public readonly code: VoiceErrorCode,
    message: string,
    public readonly status: number,
    public readonly recoverable: boolean,
  ) {
    super(message);
    this.name = 'SarvamError';
  }
}

export function voiceError(error: unknown): {
  error: { code: VoiceErrorCode; message: string; recoverable: boolean };
  status: number;
} {
  if (error instanceof SarvamError) {
    return {
      error: { code: error.code, message: error.message, recoverable: error.recoverable },
      status: error.status,
    };
  }
  return {
    error: {
      code: 'UPSTREAM_ERROR',
      message: 'The voice service is temporarily unavailable.',
      recoverable: true,
    },
    status: 502,
  };
}
