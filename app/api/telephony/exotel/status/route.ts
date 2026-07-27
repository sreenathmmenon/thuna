import { NextResponse } from 'next/server';
import {
  appendDeliveryEvidence,
  parseExotelDeliveryEvidence,
} from '../../../../../lib/channels/delivery-evidence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  // This provider callback is delivery evidence only. It never mutates a
  // routine, and its raw body is deliberately never logged or persisted because
  // Exotel status payloads can contain phone numbers.
  const evidence = parseExotelDeliveryEvidence(
    await request.text(),
    request.headers.get('content-type'),
  );
  if (evidence) appendDeliveryEvidence(evidence);
  return NextResponse.json({ accepted: true, recorded: Boolean(evidence) });
}
