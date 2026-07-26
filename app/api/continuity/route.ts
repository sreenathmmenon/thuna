import { NextResponse } from 'next/server';
import { ContinuityError } from '@/lib/continuity/errors';
import { continuityService } from '@/lib/continuity/singleton';
import type {
  CandidateField,
  CaptureSource,
  FamilyRequestState,
} from '@/lib/continuity/types';
import { continuityErrorResponse, readContinuityObject } from './http';

export const runtime = 'nodejs';

const SOURCES: CaptureSource[] = ['VOICE', 'TYPED', 'DOCUMENT', 'FAMILY'];
const FAMILY_TRANSITIONS: FamilyRequestState[] = [
  'ACCEPTED',
  'SCHEDULED',
  'COMPLETED',
  'ELDER_CONFIRMED',
  'CANCELLED',
];

function stringValue(body: Record<string, unknown>, key: string): string {
  if (typeof body[key] !== 'string') {
    throw new ContinuityError('INVALID_INPUT', `${key} must be a string.`);
  }
  return body[key];
}

function numberValue(body: Record<string, unknown>, key: string): number {
  if (typeof body[key] !== 'number') {
    throw new ContinuityError('INVALID_INPUT', `${key} must be a number.`);
  }
  return body[key];
}

function booleanValue(body: Record<string, unknown>, key: string): boolean {
  if (typeof body[key] !== 'boolean') {
    throw new ContinuityError('INVALID_INPUT', `${key} must be a boolean.`);
  }
  return body[key];
}

function candidateValue(body: Record<string, unknown>): CandidateField['value'] {
  const value = body.value;
  if (
    value !== null
    && typeof value !== 'string'
    && typeof value !== 'number'
    && typeof value !== 'boolean'
  ) {
    throw new ContinuityError('INVALID_INPUT', 'value must be a string, number, boolean or null.');
  }
  return value;
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ continuity: continuityService.snapshot() });
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ continuity: continuityService.reset() });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readContinuityObject(request);
    const action = stringValue(body, 'action');
    switch (action) {
      case 'INTAKE': {
        const source = stringValue(body, 'source') as CaptureSource;
        if (!SOURCES.includes(source)) {
          throw new ContinuityError('INVALID_INPUT', 'A supported capture source is required.');
        }
        return NextResponse.json({
          candidate: continuityService.intake(stringValue(body, 'text'), source),
        }, { status: 201 });
      }
      case 'CORRECT_CANDIDATE':
        return NextResponse.json({
          candidate: continuityService.correctCandidate(
            stringValue(body, 'id'),
            stringValue(body, 'key'),
            candidateValue(body),
          ),
        });
      case 'CONFIRM_CANDIDATE':
        return NextResponse.json(continuityService.confirmCandidate(
          stringValue(body, 'id'),
          stringValue(body, 'response'),
        ));
      case 'REJECT_CANDIDATE':
        return NextResponse.json({
          candidate: continuityService.rejectCandidate(stringValue(body, 'id')),
        });
      case 'CORRECT_EVENT':
        return NextResponse.json({
          lifeEvent: continuityService.correctLifeEvent(
            stringValue(body, 'id'),
            stringValue(body, 'key'),
            candidateValue(body),
            stringValue(body, 'response'),
          ),
        });
      case 'COMPLETE_EVENT':
        return NextResponse.json({
          lifeEvent: continuityService.completeLifeEvent(
            stringValue(body, 'id'),
            stringValue(body, 'response'),
          ),
        });
      case 'SNOOZE_EVENT':
        return NextResponse.json({
          lifeEvent: continuityService.snoozeLifeEvent(
            stringValue(body, 'id'),
            numberValue(body, 'minutes'),
          ),
        });
      case 'CANCEL_EVENT':
        return NextResponse.json({
          lifeEvent: continuityService.cancelLifeEvent(stringValue(body, 'id')),
        });
      case 'SNOOZE_LOOP':
        return NextResponse.json({
          pendingLoop: continuityService.snoozePendingLoop(
            stringValue(body, 'id'),
            numberValue(body, 'minutes'),
          ),
        });
      case 'COMPLETE_LOOP':
        return NextResponse.json({
          pendingLoop: continuityService.completePendingLoop(
            stringValue(body, 'id'),
            stringValue(body, 'response'),
          ),
        });
      case 'CANCEL_LOOP':
        return NextResponse.json({
          pendingLoop: continuityService.cancelPendingLoop(stringValue(body, 'id')),
        });
      case 'SET_FAMILY_CONTENT_CONSENT':
        return NextResponse.json({
          consent: continuityService.setFamilyContentConsent({
            contactId: stringValue(body, 'contactId'),
            granted: booleanValue(body, 'granted'),
            explicitApproval: booleanValue(body, 'explicitApproval'),
          }),
        });
      case 'CREATE_FAMILY_REQUEST':
        return NextResponse.json({
          familyRequest: continuityService.createFamilyRequest({
            contactId: stringValue(body, 'contactId'),
            purpose: stringValue(body, 'purpose'),
            disclosure: typeof body.disclosure === 'string' ? body.disclosure : undefined,
            explicitApproval: booleanValue(body, 'explicitApproval'),
          }),
        }, { status: 201 });
      case 'OFFER_FAMILY_REQUEST':
        return NextResponse.json(
          await continuityService.offerFamilyRequest(stringValue(body, 'id')),
        );
      case 'TRANSITION_FAMILY_REQUEST': {
        const target = stringValue(body, 'target') as FamilyRequestState;
        if (!FAMILY_TRANSITIONS.includes(target)) {
          throw new ContinuityError('INVALID_INPUT', 'A supported family request transition is required.');
        }
        return NextResponse.json({
          familyRequest: continuityService.transitionFamilyRequest(
            stringValue(body, 'id'),
            target,
            typeof body.detail === 'string' ? body.detail : undefined,
            typeof body.scheduledFor === 'string' ? body.scheduledFor : undefined,
            typeof body.response === 'string' ? body.response : undefined,
          ),
        });
      }
      case 'DAILY_BRIEF':
        return NextResponse.json({
          brief: continuityService.dailyBrief(
            body.onDemand === undefined ? false : booleanValue(body, 'onDemand'),
          ),
        });
      default:
        throw new ContinuityError('INVALID_INPUT', 'Unsupported continuity action.');
    }
  } catch (error) {
    return continuityErrorResponse(error);
  }
}
