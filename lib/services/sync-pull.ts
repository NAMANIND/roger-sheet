import { ActionType, ExecutionMode, JobState, Prisma, SyncRunStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseJobData } from '@/lib/job-data';
import { executionModeForActionType } from '@/lib/execution-mode';
import { getDefaultOrganization } from '@/lib/organization';
import { callExecutor, isExecutorConfigured } from '@/lib/executor';
import { incrementFullUsage } from '@/lib/services/usage';
import {
  resolveJobOrganizationId,
  touchSyncOrganizations,
} from '@/lib/services/sync-org-resolve';
import {
  normalizeExecutorProcessor,
  normalizeExecutorQueue,
  normalizeExecutorSchedule,
  parseExecutorDate,
} from '@/lib/services/executor-normalize';
import { resolveJobDisplayNames } from '@/lib/services/job-display-names';
import { fail, ok } from '@/lib/services/errors';
import type { ApiResponse, Job, Processor, Queue, RepeatableJob } from '@/types/job';

export type PullSyncStats = {
  pipelines: number;
  actions: number;
  jobs: number;
  history: number;
  schedules: number;
};

async function buildActionModeByName(): Promise<Map<string, ExecutionMode>> {
  const actions = await prisma.action.findMany({
    select: { name: true, type: true },
  });
  return new Map(
    actions.map((a) => [a.name, executionModeForActionType(a.type) as ExecutionMode])
  );
}

function executionModeForJob(
  j: Job,
  modeByAction: Map<string, ExecutionMode>
): ExecutionMode {
  if (j.executionMode === 'ping') return ExecutionMode.ping;
  return modeByAction.get(j.processor) ?? ExecutionMode.full;
}

async function clearConflictingExecutorRow(
  organizationId: string,
  entity: 'pipeline' | 'action' | 'schedule',
  id: string,
  name: string
): Promise<void> {
  if (entity === 'pipeline') {
    const byName = await prisma.pipeline.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
    if (byName && byName.id !== id) {
      await prisma.pipeline.delete({ where: { id: byName.id } });
    }
    const byIdAsName = await prisma.pipeline.findUnique({
      where: { organizationId_name: { organizationId, name: id } },
    });
    if (byIdAsName && byIdAsName.id !== id) {
      await prisma.pipeline.delete({ where: { id: byIdAsName.id } });
    }
    return;
  }

  if (entity === 'action') {
    const byName = await prisma.action.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
    if (byName && byName.id !== id) {
      await prisma.action.delete({ where: { id: byName.id } });
    }
    const byIdAsName = await prisma.action.findUnique({
      where: { organizationId_name: { organizationId, name: id } },
    });
    if (byIdAsName && byIdAsName.id !== id) {
      await prisma.action.delete({ where: { id: byIdAsName.id } });
    }
    return;
  }

  const byKey = await prisma.schedule.findUnique({
    where: { organizationId_key: { organizationId, key: name } },
  });
  if (byKey && byKey.id !== id) {
    await prisma.schedule.delete({ where: { id: byKey.id } });
  }
}

/** Pull executor (Sheets) → Postgres. History/jobs attach to the org that created them. */
export async function syncPullFromExecutor(): Promise<
  ApiResponse<{ stats: PullSyncStats }>
> {
  if (!isExecutorConfigured()) {
    return fail('APPS_SCRIPT_WEB_APP_URL is not configured');
  }

  const systemOrg = await getDefaultOrganization();

  const syncRun = await prisma.syncRun.create({
    data: {
      organizationId: systemOrg.id,
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
    const modeByAction = await buildActionModeByName();

    const [queuesRes, processorsRes, jobsRes, graveyardRes, schedulesRes] =
      await Promise.all([
        callExecutor<Queue[]>('getQueues'),
        callExecutor<Processor[]>('getProcessors'),
        callExecutor<Job[]>('getJobs', {}),
        callExecutor<Job[]>('getGraveyardJobs', {}),
        callExecutor<RepeatableJob[]>('getRepeatableJobs', {}),
      ]);

    if (queuesRes.success && queuesRes.data) {
      for (const raw of queuesRes.data) {
        const q = normalizeExecutorQueue(raw);
        if (!q) continue;
        if (q.id) {
          await clearConflictingExecutorRow(systemOrg.id, 'pipeline', q.id, q.name);
          await prisma.pipeline.upsert({
            where: { id: q.id },
            create: {
              id: q.id,
              organizationId: systemOrg.id,
              name: q.name,
              isPaused: q.isPaused,
              metadata: { syncedAt: new Date().toISOString() },
              createdAt: parseExecutorDate(q.createdAt),
            },
            update: { isPaused: q.isPaused, name: q.name },
          });
        } else {
          await prisma.pipeline.upsert({
            where: {
              organizationId_name: { organizationId: systemOrg.id, name: q.name },
            },
            create: {
              organizationId: systemOrg.id,
              name: q.name,
              isPaused: q.isPaused,
              metadata: { syncedAt: new Date().toISOString() },
              createdAt: parseExecutorDate(q.createdAt),
            },
            update: { isPaused: q.isPaused },
          });
        }
        stats.pipelines++;
      }
    }

    if (processorsRes.success && processorsRes.data) {
      for (const raw of processorsRes.data) {
        const p = normalizeExecutorProcessor(raw);
        if (!p) continue;
        if (p.id) {
          await clearConflictingExecutorRow(systemOrg.id, 'action', p.id, p.name);
          await prisma.action.upsert({
            where: { id: p.id },
            create: {
              id: p.id,
              organizationId: systemOrg.id,
              name: p.name,
              type: p.type as ActionType,
              config: p.config as object,
              description: p.description,
              metadata: {},
              createdAt: parseExecutorDate(p.createdAt),
            },
            update: {
              name: p.name,
              type: p.type as ActionType,
              config: p.config as object,
              description: p.description,
            },
          });
        } else {
          await prisma.action.upsert({
            where: {
              organizationId_name: { organizationId: systemOrg.id, name: p.name },
            },
            create: {
              organizationId: systemOrg.id,
              name: p.name,
              type: p.type as ActionType,
              config: p.config as object,
              description: p.description,
              metadata: {},
              createdAt: parseExecutorDate(p.createdAt),
            },
            update: {
              type: p.type as ActionType,
              config: p.config as object,
              description: p.description,
            },
          });
        }
        stats.actions++;
      }
    }

    if (jobsRes.success && jobsRes.data) {
      for (const j of jobsRes.data) {
        const organizationId = await resolveJobOrganizationId(j.id);
        const names = await resolveJobDisplayNames(
          organizationId,
          j.queueName,
          j.processor
        );
        const data = parseJobData(j.data) as Prisma.InputJsonValue;
        const executionMode = executionModeForJob(
          { ...j, processor: names.actionName },
          modeByAction
        );

        await prisma.job.upsert({
          where: { id: j.id },
          create: {
            id: j.id,
            organizationId,
            pipelineName: names.pipelineName,
            actionName: names.actionName,
            data,
            state: j.state as JobState,
            priority: j.priority,
            attempts: j.attempts,
            maxAttempts: j.maxAttempts,
            delayMs: j.delay ?? 0,
            repeatKey: j.repeatJobKey,
            executionMode,
            processedAt: j.processedOn ? new Date(j.processedOn) : null,
            createdAt: parseExecutorDate(j.timestamp),
            executorSyncedAt: new Date(),
            metadata: {},
          },
          update: {
            organizationId,
            state: j.state as JobState,
            data,
            priority: j.priority,
            attempts: j.attempts,
            pipelineName: names.pipelineName,
            actionName: names.actionName,
            executorSyncedAt: new Date(),
          },
        });
        stats.jobs++;
      }
    }

    if (graveyardRes.success && graveyardRes.data) {
      for (const j of graveyardRes.data) {
        const organizationId = await resolveJobOrganizationId(j.id);
        const names = await resolveJobDisplayNames(
          organizationId,
          j.queueName,
          j.processor
        );
        const data = parseJobData(j.data) as Prisma.InputJsonValue;
        const finishedAt = j.finishedOn
          ? parseExecutorDate(j.finishedOn)
          : parseExecutorDate(j.timestamp);
        const executionMode = executionModeForJob(
          { ...j, processor: names.actionName },
          modeByAction
        );

        const existing = await prisma.jobHistory.findUnique({
          where: { id: j.id },
          select: { state: true, organizationId: true },
        });

        await prisma.jobHistory.upsert({
          where: { id: j.id },
          create: {
            id: j.id,
            organizationId,
            pipelineName: names.pipelineName,
            actionName: names.actionName,
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
            createdAt: parseExecutorDate(j.timestamp),
            metadata: {},
          },
          update: {
            organizationId,
            state: j.state as JobState,
            data,
            finishedAt,
            failedReason: j.failedReason ?? null,
            returnValue: j.returnvalue ?? undefined,
            pipelineName: names.pipelineName,
            actionName: names.actionName,
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
          await incrementFullUsage(organizationId);
        }
      }
    }

    if (schedulesRes.success && schedulesRes.data) {
      for (const raw of schedulesRes.data) {
        const s = normalizeExecutorSchedule(raw);
        const names = await resolveJobDisplayNames(
          systemOrg.id,
          s.queueName,
          s.processor
        );
        await clearConflictingExecutorRow(systemOrg.id, 'schedule', s.id, s.key);
        await prisma.schedule.upsert({
          where: { id: s.id },
          create: {
            id: s.id,
            organizationId: systemOrg.id,
            key: s.key,
            pipelineName: names.pipelineName,
            actionName: names.actionName,
            data: parseJobData(s.data) as Prisma.InputJsonValue,
            pattern: s.pattern,
            enabled: s.enabled,
            lastRunAt: s.lastRun ? parseExecutorDate(s.lastRun) : null,
            nextRunAt: s.nextRun ? parseExecutorDate(s.nextRun) : null,
            metadata: {},
          },
          update: {
            key: s.key,
            pipelineName: names.pipelineName,
            actionName: names.actionName,
            data: parseJobData(s.data) as Prisma.InputJsonValue,
            pattern: s.pattern,
            enabled: s.enabled,
            lastRunAt: s.lastRun ? parseExecutorDate(s.lastRun) : null,
            nextRunAt: s.nextRun ? parseExecutorDate(s.nextRun) : null,
          },
        });
        stats.schedules++;
      }
    }

    const orgIds = await touchSyncOrganizations();
    await prisma.executionBackend.updateMany({
      where: { organizationId: { in: orgIds } },
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
    const orgIds = await touchSyncOrganizations();
    await prisma.executionBackend.updateMany({
      where: { organizationId: { in: orgIds } },
      data: { lastError: message },
    });
    return fail(message);
  }
}
