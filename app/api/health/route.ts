import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function releaseTag(): string {
  // RAILWAY_GIT_COMMIT_SHA is injected at build time; avoids shelling out to git at runtime.
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA?.trim();
  if (sha) return sha.slice(0, 7);
  return process.env.RAILWAY_SERVICE_NAME ? 'railway' : 'local';
}

// Lightweight healthcheck — no external calls (no Sarvam/Swiggy/DB/notification contact).
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'thuna',
    release: releaseTag(),
    timestamp: new Date().toISOString(),
  });
}
