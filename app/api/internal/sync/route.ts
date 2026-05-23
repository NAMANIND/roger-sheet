import { NextRequest, NextResponse } from 'next/server';
import { runSync } from '@/lib/services/sync-run';

function unauthorized() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

export type SyncRequestBody = {
  /** Drain outbox → Apps Script (default: true) */
  push?: boolean;
  /** Run waiting Ping jobs from Postgres (optional — Apps Script trigger handles http_ping by default) */
  pings?: boolean;
  /** Sheets → Postgres (default: true) */
  pull?: boolean;
  /** Max outbox rows per request (default: 50) */
  pushLimit?: number;
  /** Max Ping jobs to dispatch per request (default: 25) */
  pingLimit?: number;
};

/**
 * Phase B — your infrastructure calls this on a schedule.
 *
 * POST /api/internal/sync
 * Authorization: Bearer <INTERNAL_API_SECRET>
 * Body: { "push": true, "pull": true }
 * Optional: { "pings": true } for Postgres-side ping dispatch (legacy fallback)
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'INTERNAL_API_SECRET not configured' },
      { status: 503 }
    );
  }

  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || token !== secret) return unauthorized();

  let body: SyncRequestBody = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as SyncRequestBody;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const result = await runSync({
    push: body.push,
    pings: body.pings,
    pull: body.pull,
    pushLimit: body.pushLimit,
    pingLimit: body.pingLimit,
  });

  const status = result.success ? 200 : 500;
  return NextResponse.json(result, { status });
}
