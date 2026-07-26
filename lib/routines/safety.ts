import { RoutineError } from './errors';
import type { CreateRoutineInput, RoutineType } from './types';

const SENSITIVE_PATTERN = /\b(?:otp|one[\s-]?time password|pin|cvv|card security code)\b/i;
const MEDICAL_ADVICE_PATTERN =
  /\b(?:diagnos(?:e|is)|prescrib(?:e|ed)|should\s+i\s+take|increase|decrease|double|skip|change)\b|(?:\d+(?:\.\d+)?\s*(?:mg|mcg|ml|tablets?|capsules?|drops?))\b/i;

const DEFAULT_COPY: Record<RoutineType, { title: string; reminderText: string }> = {
  MEDICINE_REMINDER: {
    title: 'Medicine reminder',
    reminderText:
      'This is your medicine reminder. Please follow the instructions already given by your healthcare professional.',
  },
  WATER_REMINDER: {
    title: 'Water reminder',
    reminderText: 'This is your agreed water reminder.',
  },
  BILL_REMINDER: {
    title: 'Bill reminder',
    reminderText: 'This is your agreed bill reminder. No payment has been made.',
  },
  FAMILY_CALL_REMINDER: {
    title: 'Family call reminder',
    reminderText: 'This is your agreed reminder to call your family.',
  },
  DELIVERY_FOLLOW_UP: {
    title: 'Delivery follow-up',
    reminderText: 'This is your agreed delivery follow-up. Thuna cannot promise a delivery time.',
  },
  GENERAL_CHECK_IN: {
    title: 'General check-in',
    reminderText: 'This is your agreed check-in.',
  },
};

export function assertSafeText(value: string): void {
  if (SENSITIVE_PATTERN.test(value)) {
    throw new RoutineError(
      'SAFETY_BLOCK',
      'Thuna never stores OTP, PIN, CVV, or banking credentials.',
      400,
    );
  }
}

export function safeRoutineCopy(input: CreateRoutineInput): {
  title: string;
  reminderText: string;
} {
  const copy = DEFAULT_COPY[input.type];
  if (!copy) {
    throw new RoutineError('INVALID_INPUT', 'Unsupported routine type.');
  }

  if (input.title) {
    assertSafeText(input.title);
    if (input.type === 'MEDICINE_REMINDER' && MEDICAL_ADVICE_PATTERN.test(input.title)) {
      throw new RoutineError(
        'SAFETY_BLOCK',
        'Medicine routines can remind only; they cannot store dosage, diagnosis, or schedule-change advice.',
      );
    }
  }

  // Medicine copy is always canonical and never incorporates medicine or dosage details.
  if (input.type === 'MEDICINE_REMINDER') return copy;

  const title = input.title?.trim() || copy.title;
  if (title.length > 100) {
    throw new RoutineError('INVALID_INPUT', 'Routine title must be 100 characters or fewer.');
  }

  return { title, reminderText: copy.reminderText };
}

export function isExplicitCompletion(response: string | undefined): boolean {
  if (!response?.trim()) return false;
  return /^(?:yes[,.!\s]*)?(?:done|completed|i did it|i have done it|taken|i took it|yes)$/i.test(
    response.trim(),
  );
}
