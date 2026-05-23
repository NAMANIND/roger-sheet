import { NextRequest, NextResponse } from 'next/server';
import { callExecutor, type ExecutorAction } from '@/lib/executor';

function unauthorized() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

/**
 * Internal execution proxy — for workers/cron, not browser clients.
 * POST { action, data } with header: Authorization: Bearer <INTERNAL_API_SECRET>
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

  let body: { action?: ExecutorAction; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.action) {
    return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 });
  }

  const result = await callExecutor(body.action, body.data);
  return NextResponse.json(result);
}
