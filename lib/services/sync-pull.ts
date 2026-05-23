import { ActionType, ExecutionMode, JobState, Prisma, SyncRunStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseJobData } from '@/lib/job-data';
import { executionModeForActionType } from '@/lib/execution-mode';
import { getDefaultOrganization } from '@/lib/organization';
import { callExecutor, isExecutorConfigured } from '@/lib/executor';
import { incrementFullUsage } from '@/lib/services/usage';
import { fail, ok } from '@/lib/services/errors';
import type { ApiResponse, Job, Processor, Queue, RepeatableJob } from '@/types/job';

export type PullSyncStats = {
  pipelines: number;
  actions: number;
  jobs: number;
  history: number;
  schedules: number;
};

/** Pull executor (Sheets) → Postgres. */
export async function syncPullFromExecutor(): Promise<
  ApiResponse<{ stats: PullSyncStats }>
> {
  if (!isExecutorConfigured()) {
    return fail('APPS_SCRIPT_WEB_APP_URL is not configured');
  }

  const org = await getDefaultOrganization();

  const syncRun = await prisma.syncRun.create({
    data: {
      organizationId: org.id,
      status: SyncRunStatus.running,
      direction: 'from_executor',
    },
  });

  const stats: PullSyncStats = {
    pipelines: 0,
    actions: 0,
    jobs: 0,
    history: 0,
    schedules: 0,
  };

  try {
    const [queuesRes, processorsRes, jobsRes, graveyardRes, schedulesRes] =
      await Promise.all([
        callExecutor<Queue[]>('getQueues'),
        callExecutor<Processor[]>('getProcessors'),
        callExecutor<Job[]>('getJobs', {}),
        callExecutor<Job[]>('getGraveyardJobs', {}),
        callExecutor<RepeatableJob[]>('getRepeatableJobs', {}),
      ]);

    if (queuesRes.success && queuesRes.data) {
      for (const q of queuesRes.data) {
        await prisma.pipeline.upsert({
          where: {
            organizationId_name: { organizationId: org.id, name: q.name },
          },
          create: {
            organizationId: org.id,
            name: q.name,
            isPaused: q.isPaused,
            metadata: { syncedAt: new Date().toISOString() },
            createdAt: new Date(q.createdAt),
          },
          update: { isPaused: q.isPaused },
        });
        stats.pipelines++;
      }
    }

    if (processorsRes.success && processorsRes.data) {
      for (const p of processorsRes.data) {
        await prisma.action.upsert({
          where: {
            organizationId_name: { organizationId: org.id, name: p.name },
          },
          create: {
            organizationId: org.id,
            name: p.name,
            type: p.type as ActionType,
            config: p.config as object,
            description: p.description,
            metadata: {},
            createdAt: new Date(p.createdAt),
          },
          update: {
            type: p.type as ActionType,
            config: p.config as object,
            description: p.description,
          },
        });
        stats.actions++;
      }
    }

    if (jobsRes.success && jobsRes.data) {
      const actions = await prisma.action.findMany({
        where: { organizationId: org.id },
        select: { name: true, type: true },
      });
      const modeByAction = new Map(
        actions.map((a) => [a.name, executionModeForActionType(a.type) as ExecutionMode])
      );

      for (const j of jobsRes.data) {
        const data = parseJobData(j.data) as Prisma.InputJsonValue;
        const executionMode =
          j.executionMode === 'ping'
            ? ExecutionMode.ping
            : (modeByAction.get(j.processor) ?? ExecutionMode.full);
        await prisma.job.upsert({
          where: { id: j.id },
          create: {
            id: j.id,
            organizationId: org.id,
            pipelineName: j.queueName,
            actionName: j.processor,
            data,
            state: j.state as JobState,
            priority: j.priority,
            attempts: j.attempts,
            maxAttempts: j.maxAttempts,
            delayMs: j.delay ?? 0,
            repeatKey: j.repeatJobKey,
            executionMode,
            processedAt: j.processedOn ? new Date(j.processedOn) : null,
            createdAt: new Date(j.timestamp),
            executorSyncedAt: new Date(),
            metadata: {},
          },
          update: {
            state: j.state as JobState,
            data,
            priority: j.priority,
            attempts: j.attempts,
            executorSyncedAt: new Date(),
          },
        });
        stats.jobs++;
      }
    }

    if (graveyardRes.success && graveyardRes.data) {
      const actions = await prisma.action.findMany({
        where: { organizationId: org.id },
        select: { name: true, type: true },
      });
      const modeByAction = new Map(
        actions.map((a) => [a.name, executionModeForActionType(a.type) as ExecutionMode])
      );

      for (const j of graveyardRes.data) {
        const data = parseJobData(j.data) as Prisma.InputJsonValue;
        const finishedAt = j.finishedOn
          ? new Date(j.finishedOn)
          : new Date(j.timestamp);
        const executionMode =
          j.executionMode === 'ping'
            ? ExecutionMode.ping
            : (modeByAction.get(j.processor) ?? ExecutionMode.full);

        const existing = await prisma.jobHistory.findUnique({
          where: { id: j.id },
          select: { state: true },
        });

        await prisma.jobHistory.upsert({
          where: { id: j.id },
          create: {
            id: j.id,
            organizationId: org.id,
            pipelineName: j.queueName,
            actionName: j.processor,
            data,
            state: j.state as JobState,
            priority: j.priority,
            attempts: j.attempts,
            maxAttempts: j.maxAttempts,
            repeatKey: j.repeatJobKey,
            executionMode,
            processedAt: j.processedOn ? new Date(j.processedOn) : null,
            finishedAt,
            failedReason: j.failedReason ?? null,
            returnValue: j.returnvalue ?? undefined,
            createdAt: new Date(j.timestamp),
            metadata: {},
          },
          update: {
            state: j.state as JobState,
            data,
            finishedAt,
            failedReason: j.failedReason ?? null,
            returnValue: j.returnvalue ?? undefined,
          },
        });
        await prisma.job.deleteMany({ where: { id: j.id } });
        stats.history++;

        const completed = j.state === JobState.completed;
        const wasCompleted = existing?.state === JobState.completed;
        if (
          completed &&
          !wasCompleted &&
          executionMode === ExecutionMode.full
        ) {
          await incrementFullUsage(org.id);
        }
      }
    }

    if (schedulesRes.success && schedulesRes.data) {
      for (const s of schedulesRes.data) {
        await prisma.schedule.upsert({
          where: {
            organizationId_key: { organizationId: org.id, key: s.key },
          },
          create: {
            organizationId: org.id,
            key: s.key,
            pipelineName: s.queueName,
            actionName: s.processor,
            data: parseJobData(s.data) as Prisma.InputJsonValue,
            pattern: s.pattern,
            enabled: s.enabled,
            lastRunAt: s.lastRun ? new Date(s.lastRun) : null,
            nextRunAt: s.nextRun ? new Date(s.nextRun) : null,
            metadata: {},
          },
          update: {
            data: parseJobData(s.data) as Prisma.InputJsonValue,
            pattern: s.pattern,
            enabled: s.enabled,
            lastRunAt: s.lastRun ? new Date(s.lastRun) : null,
            nextRunAt: s.nextRun ? new Date(s.nextRun) : null,
          },
        });
        stats.schedules++;
      }
    }

    await prisma.executionBackend.updateMany({
      where: { organizationId: org.id },
      data: { lastSyncAt: new Date(), lastError: null },
    });

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SyncRunStatus.completed,
        finishedAt: new Date(),
        stats: stats as object,
      },
    });

    return ok({ stats }, 'Pull sync completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pull sync failed';
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SyncRunStatus.failed,
        finishedAt: new Date(),
        error: message,
      },
    });
    await prisma.executionBackend.updateMany({
      where: { organizationId: org.id },
      data: { lastError: message },
    });
    return fail(message);
  }
}
