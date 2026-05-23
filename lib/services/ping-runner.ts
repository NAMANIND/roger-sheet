import { ActionType, ExecutionMode, JobState, type Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseJobData } from '@/lib/job-data';
import { firePingHttp } from '@/lib/ping-http';
import { listSyncOrganizations } from '@/lib/organization';
import { isExecutorConfigured } from '@/lib/executor';
import { syncToExecutor } from '@/lib/services/executor-sync';
import { incrementPingUsage } from '@/lib/services/usage';
import { fail, ok } from '@/lib/services/errors';
import type { ApiResponse, HttpProcessorConfig } from '@/types/job';

export type DispatchPingStats = {
  candidates: number;
  dispatched: number;
  errors: number;
};

const DEFAULT_LIMIT = 25;

async function markPingDispatched(job: Job): Promise<void> {
  const finishedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.jobHistory.upsert({
      where: { id: job.id },
      create: {
        id: job.id,
        organizationId: job.organizationId,
        pipelineName: job.pipelineName,
        actionName: job.actionName,
        data: job.data as object,
        state: JobState.completed,
        priority: job.priority,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        repeatKey: job.repeatKey,
        executionMode: job.executionMode,
        processedAt: job.processedAt ?? finishedAt,
        finishedAt,
        returnValue: { dispatched: true },
        createdAt: job.createdAt,
        metadata: job.metadata as object,
      },
      update: {
        state: JobState.completed,
        finishedAt,
        returnValue: { dispatched: true },
      },
    });
    await tx.job.deleteMany({ where: { id: job.id } });
  });

  await incrementPingUsage(job.organizationId);

  if (isExecutorConfigured()) {
    await syncToExecutor(
      job.organizationId,
      'runPingJob',
      { id: job.id },
      { entityId: job.id }
    );
  }
}

async function dispatchForOrganization(
  organizationId: string,
  limit: number
): Promise<DispatchPingStats> {
  const now = Date.now();

  const rows = await prisma.job.findMany({
    where: {
      organizationId,
      executionMode: ExecutionMode.ping,
      state: { in: [JobState.waiting, JobState.delayed] },
      executorSyncedAt: { not: null },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    take: limit * 2,
  });

  const eligible = rows
    .filter((job) => {
      if (job.state === JobState.waiting) return true;
      return job.createdAt.getTime() + job.delayMs <= now;
    })
    .slice(0, limit);

  const stats: DispatchPingStats = {
    candidates: eligible.length,
    dispatched: 0,
    errors: 0,
  };

  if (eligible.length === 0) return stats;

  const actionNames = [...new Set(eligible.map((j) => j.actionName))];
  const actions = await prisma.action.findMany({
    where: {
      organizationId,
      name: { in: actionNames },
    },
  });
  const actionByName = new Map(actions.map((a) => [a.name, a]));

  for (const job of eligible) {
    const action = actionByName.get(job.actionName);
    if (!action || action.type !== ActionType.http_ping) {
      stats.errors++;
      continue;
    }

    const claimed = await prisma.job.updateMany({
      where: {
        id: job.id,
        state: { in: [JobState.waiting, JobState.delayed] },
      },
      data: { state: JobState.active, processedAt: new Date() },
    });
    if (claimed.count === 0) continue;

    const config = action.config as unknown as HttpProcessorConfig;
    const data = parseJobData(job.data);
    firePingHttp(config, data);

    void markPingDispatched(job).catch(() => {
      stats.errors++;
    });

    stats.dispatched++;
  }

  return stats;
}

/**
 * Fire ping webhooks from the sync worker (no await). Sheet gets a lightweight complete sync.
 */
export async function dispatchPendingPingJobs(
  limit = DEFAULT_LIMIT
): Promise<ApiResponse<DispatchPingStats>> {
  const orgs = await listSyncOrganizations();
  const combined: DispatchPingStats = {
    candidates: 0,
    dispatched: 0,
    errors: 0,
  };

  for (const org of orgs) {
    const stats = await dispatchForOrganization(org.id, limit);
    combined.candidates += stats.candidates;
    combined.dispatched += stats.dispatched;
    combined.errors += stats.errors;
  }

  if (combined.candidates === 0) {
    return ok(combined, 'No ping jobs to dispatch');
  }

  return ok(combined, `Dispatched ${combined.dispatched} ping job(s)`);
}
