import { SyncOutboxStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { ExecutorAction } from '@/lib/executor';

const MAX_PENDING_PER_ENTITY = 10;

export async function enqueueExecutorSync(
  organizationId: string,
  executorAction: ExecutorAction,
  payload: unknown,
  options?: { entityId?: string }
): Promise<void> {
  const entityId = options?.entityId ?? null;

  if (entityId) {
    const pendingCount = await prisma.syncOutbox.count({
      where: {
        organizationId,
        entityId,
        executorAction,
        status: { in: [SyncOutboxStatus.pending, SyncOutboxStatus.processing] },
      },
    });
    if (pendingCount >= MAX_PENDING_PER_ENTITY) {
      return;
    }
  }

  await prisma.syncOutbox.create({
    data: {
      organizationId,
      executorAction,
      entityId,
      payload: payload as object,
      status: SyncOutboxStatus.pending,
      nextRetryAt: new Date(),
    },
  });
}

export type PushOutboxStats = {
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
};
