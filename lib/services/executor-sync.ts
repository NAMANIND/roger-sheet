import { callExecutor, type ExecutorAction } from '@/lib/executor';
import { prisma } from '@/lib/prisma';
import { isAsyncSync } from '@/lib/sync-mode';
import { enqueueExecutorSync } from '@/lib/services/outbox';
import { requireExecutor } from '@/lib/services/errors';
import type { ApiResponse } from '@/types/job';

/**
 * After a Postgres write: enqueue for async push, or call Apps Script inline (Phase A).
 */
export async function syncToExecutor(
  organizationId: string,
  action: ExecutorAction,
  payload: unknown,
  options?: {
    entityId?: string;
    rollback?: () => Promise<unknown>;
  }
): Promise<ApiResponse<void>> {
  if (isAsyncSync()) {
    await enqueueExecutorSync(organizationId, action, payload, {
      entityId: options?.entityId,
    });
    return { success: true };
  }

  const result = await requireExecutor(
    await callExecutor(action, payload),
    options?.rollback
  );
  if (!result.success) {
    return { success: false, error: result.error ?? 'Executor sync failed' };
  }
  if (
    options?.entityId &&
    (action === 'addJob' || action === 'retryJob')
  ) {
    await prisma.job.updateMany({
      where: { id: options.entityId },
      data: { executorSyncedAt: new Date() },
    });
  }
  return { success: true };
}
