import { NextResponse } from 'next/server';
import { getSwiggyRuntime } from '../../../../../lib/integrations/swiggy/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const destination = new URL('/', requestUrl);
  try {
    await getSwiggyRuntime().connection.callback({
      code: requestUrl.searchParams.get('code'),
      state: requestUrl.searchParams.get('state'),
      error: requestUrl.searchParams.get('error'),
    });
    destination.searchParams.set('swiggy', 'connected');
  } catch {
    destination.searchParams.set('swiggy', 'reconnect');
  }
  return NextResponse.redirect(destination);
}
