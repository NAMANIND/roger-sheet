import { SyncOutboxStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { callExecutor, isExecutorConfigured, type ExecutorAction } from '@/lib/executor';
import { listSyncOrganizations } from '@/lib/organization';
import { fail, ok } from '@/lib/services/errors';
import type { ApiResponse } from '@/types/job';
import type { PushOutboxStats } from '@/lib/services/outbox';

const DEFAULT_BATCH = 50;
const RETRY_BASE_MS = 5_000;

function backoffMs(attempts: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** attempts, 300_000);
}

export async function pushOutboxToExecutor(
  limit = DEFAULT_BATCH
): Promise<ApiResponse<PushOutboxStats>> {
  if (!isExecutorConfigured()) {
    return fail('APPS_SCRIPT_WEB_APP_URL is not configured');
  }

  const orgIds = (await listSyncOrganizations()).map((o) => o.id);
  const now = new Date();

  const entries = await prisma.syncOutbox.findMany({
    where: {
      organizationId: { in: orgIds },
      status: SyncOutboxStatus.pending,
      nextRetryAt: { lte: now },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const stats: PushOutboxStats = {
    processed: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
  };

  for (const entry of entries) {
    stats.processed++;

    const claimed = await prisma.syncOutbox.updateMany({
      where: { id: entry.id, status: SyncOutboxStatus.pending },
      data: { status: SyncOutboxStatus.processing },
    });
    if (claimed.count === 0) {
      stats.skipped++;
      continue;
    }

    const action = entry.executorAction as ExecutorAction;
    const result = await callExecutor(action, entry.payload);

    if (result.success) {
      await prisma.syncOutbox.update({
        where: { id: entry.id },
        data: {
          status: SyncOutboxStatus.completed,
          processedAt: new Date(),
          lastError: null,
        },
      });
      if (
        entry.entityId &&
        (action === 'addJob' || action === 'retryJob')
      ) {
        await prisma.job.updateMany({
          where: { id: entry.entityId },
          data: { executorSyncedAt: new Date() },
        });
      }
      stats.completed++;
      continue;
    }

    const attempts = entry.attempts + 1;
    const error = result.error ?? 'Unknown executor error';
    const isFinal = attempts >= entry.maxAttempts;

    await prisma.syncOutbox.update({
      where: { id: entry.id },
      data: {
        status: isFinal ? SyncOutboxStatus.failed : SyncOutboxStatus.pending,
        attempts,
        lastError: error,
        nextRetryAt: new Date(Date.now() + backoffMs(attempts)),
        processedAt: isFinal ? new Date() : null,
      },
    });
    stats.failed++;
  }

  return ok(stats);
}
