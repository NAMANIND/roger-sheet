import { fail, ok } from '@/lib/services/errors';
import { pushOutboxToExecutor } from '@/lib/services/sync-push';
import { reconcileExecutorEntities } from '@/lib/services/executor-ensure';
import type { PushOutboxStats } from '@/lib/services/outbox';
import {
  syncPullFromExecutor,
  type PullSyncStats,
} from '@/lib/services/sync-pull';
import {
  dispatchPendingPingJobs,
  type DispatchPingStats,
} from '@/lib/services/ping-runner';
import type { ApiResponse } from '@/types/job';

export type { PullSyncStats };

export type UnifiedSyncResult = {
  push?: PushOutboxStats;
  pings?: DispatchPingStats;
  pull?: PullSyncStats;
  durationMs: number;
};

export type SyncRunOptions = {
  push?: boolean;
  /** Dispatch waiting Ping jobs via separate Script executions (default: true when push runs) */
  pings?: boolean;
  pull?: boolean;
  pushLimit?: number;
  pingLimit?: number;
};

/**
 * Phase B entrypoint for your infrastructure.
 * POST /api/internal/sync with { "push": true, "pings": true, "pull": true }
 */
export async function runSync(
  options: SyncRunOptions = {}
): Promise<ApiResponse<UnifiedSyncResult>> {
  const start = Date.now();
  const doPush = options.push !== false;
  const doPull = options.pull !== false;
  const doPings = options.pings !== false && doPush;

  if (!doPush && !doPull) {
    return fail('At least one of push or pull must be true');
  }

  const result: UnifiedSyncResult = { durationMs: 0 };

  if (doPush) {
    await reconcileExecutorEntities();
    const pushResult = await pushOutboxToExecutor(options.pushLimit);
    if (!pushResult.success) return fail(pushResult.error ?? 'Push failed');
    result.push = pushResult.data;
  }

  if (doPings) {
    const pingResult = await dispatchPendingPingJobs(options.pingLimit);
    if (!pingResult.success) return fail(pingResult.error ?? 'Ping dispatch failed');
    result.pings = pingResult.data;
  }

  if (doPull) {
    const pullResult = await syncPullFromExecutor();
    if (!pullResult.success) return fail(pullResult.error ?? 'Pull failed');
    result.pull = pullResult.data?.stats;
  }

  result.durationMs = Date.now() - start;
  return ok(result, 'Sync completed');
}
