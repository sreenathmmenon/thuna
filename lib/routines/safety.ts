import { RoutineError } from './errors';
import type { CreateRoutineInput, RoutineType } from './types';

const SENSITIVE_PATTERN =
  /\b(?:otp|one[\s-]?time password|pin|cvv|card security code|payment password)\b/i;
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
  APPOINTMENT_REMINDER: {
    title: 'Appointment reminder',
    reminderText: 'This is your appointment reminder.',
  },
  MEAL_REMINDER: {
    title: 'Meal reminder',
    reminderText: 'This is your agreed meal reminder.',
  },
  EXERCISE_REMINDER: {
    title: 'Movement reminder',
    reminderText:
      'This is your agreed movement reminder. Follow the plan given by your clinician or trainer.',
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

  if (input.title) assertSafeText(input.title);
  if (input.reminderText) assertSafeText(input.reminderText);

  if (input.type === 'MEDICINE_REMINDER') {
    const proposed = `${input.title ?? ''} ${input.reminderText ?? ''}`;
    if (MEDICAL_ADVICE_PATTERN.test(proposed)) {
      throw new RoutineError(
        'SAFETY_BLOCK',
        'Medicine routines can remind only; they cannot store dosage, diagnosis, or schedule-change advice.',
      );
    }
    // Medicine copy remains canonical and never persists medicine or dosage details.
    return copy;
  }

  const title = input.title?.trim() || copy.title;
  const reminderText = input.reminderText?.trim() || copy.reminderText;
  if (title.length > 120 || reminderText.length > 500) {
    throw new RoutineError('INVALID_INPUT', 'Reminder text is too long.');
  }

  return { title, reminderText };
}

export function isExplicitCompletion(response: string | undefined): boolean {
  if (!response?.trim()) return false;
  return /^(?:yes[,.!\s]*)?(?:done|completed|i did it|i have done it|taken|i took it|yes)$/i.test(
    response.trim(),
  );
}
