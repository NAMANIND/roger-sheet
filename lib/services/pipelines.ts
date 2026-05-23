import { JobState } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mapPipeline } from '@/lib/db/mappers';
import { getActiveOrganization } from '@/lib/organization';
import { callExecutor } from '@/lib/executor';
import { syncToExecutor } from '@/lib/services/executor-sync';
import { fail, ok } from '@/lib/services/errors';
import type { ApiResponse, Queue, QueueStats, UsageDayStats, WorkerStats } from '@/types/job';

export async function createPipeline(name: string): Promise<ApiResponse<Queue>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');

  const existing = await prisma.pipeline.findUnique({
    where: { organizationId_name: { organizationId: org.id, name } },
  });
  if (existing) return fail('Pipeline already exists');

  const row = await prisma.pipeline.create({
    data: {
      organizationId: org.id,
      name,
      metadata: {},
    },
  });

  const sync = await syncToExecutor(org.id,
    'createQueue',
    { id: row.id, name },
    {
      entityId: row.id,
      rollback: () => prisma.pipeline.delete({ where: { id: row.id } }),
    }
  );
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok(mapPipeline(row), 'Pipeline created');
}

export async function listPipelines(): Promise<ApiResponse<Queue[]>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const rows = await prisma.pipeline.findMany({
    where: { organizationId: org.id },
    orderBy: { name: 'asc' },
  });
  return ok(rows.map(mapPipeline));
}

export async function getPipelineStats(): Promise<ApiResponse<QueueStats[]>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const pipelines = await prisma.pipeline.findMany({
    where: { organizationId: org.id },
  });

  const [activeJobs, historyJobs] = await Promise.all([
    prisma.job.findMany({
      where: { organizationId: org.id },
      select: { pipelineName: true, state: true },
    }),
    prisma.jobHistory.findMany({
      where: { organizationId: org.id },
      select: { pipelineName: true, state: true },
    }),
  ]);

  const pausedByName = new Map(pipelines.map((p) => [p.name, p.isPaused]));
  const pipelineNames = new Set<string>([
    ...pipelines.map((p) => p.name),
    ...activeJobs.map((j) => j.pipelineName),
    ...historyJobs.map((j) => j.pipelineName),
  ]);

  const stats: QueueStats[] = [...pipelineNames].sort().map((name) => {
    const queueActive = activeJobs.filter((j) => j.pipelineName === name);
    const queueHistory = historyJobs.filter((j) => j.pipelineName === name);
    return {
      name,
      total: queueActive.length + queueHistory.length,
      waiting: queueActive.filter((j) => j.state === JobState.waiting).length,
      active: queueActive.filter((j) => j.state === JobState.active).length,
      delayed: queueActive.filter((j) => j.state === JobState.delayed).length,
      completed: queueHistory.filter((j) => j.state === JobState.completed).length,
      failed: queueHistory.filter((j) => j.state === JobState.failed).length,
      isPaused: pausedByName.get(name) ?? false,
    };
  });

  return ok(stats);
}

export async function pausePipeline(name: string): Promise<ApiResponse<void>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const row = await prisma.pipeline.findUnique({
    where: { organizationId_name: { organizationId: org.id, name } },
  });
  if (!row) return fail('Pipeline not found');

  await prisma.pipeline.update({
    where: { id: row.id },
    data: { isPaused: true },
  });

  const sync = await syncToExecutor(org.id,
    'pauseQueue',
    { id: row.id, name },
    {
      entityId: `pause:${row.id}`,
      rollback: () =>
        prisma.pipeline.update({ where: { id: row.id }, data: { isPaused: false } }),
    }
  );
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok(undefined as void);
}

export async function resumePipeline(name: string): Promise<ApiResponse<void>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const row = await prisma.pipeline.findUnique({
    where: { organizationId_name: { organizationId: org.id, name } },
  });
  if (!row) return fail('Pipeline not found');

  await prisma.pipeline.update({
    where: { id: row.id },
    data: { isPaused: false },
  });

  const sync = await syncToExecutor(org.id,
    'resumeQueue',
    { id: row.id, name },
    {
      entityId: `resume:${row.id}`,
      rollback: () =>
        prisma.pipeline.update({ where: { id: row.id }, data: { isPaused: true } }),
    }
  );
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok(undefined as void);
}

export async function getWorkerStats(): Promise<ApiResponse<WorkerStats>> {
  const exec = await callExecutor<WorkerStats>('getWorkerStats');
  if (exec.success && exec.data) return ok(exec.data);
  return ok({
    lastRun: null,
    totalProcessed: 0,
    isRunning: false,
    usageToday: null,
  });
}

export async function getUsageStats(
  days = 30
): Promise<ApiResponse<{ days: UsageDayStats[]; today: UsageDayStats | null }>> {
  return callExecutor('getUsageStats', { days });
}
