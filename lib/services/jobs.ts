import { ExecutionMode, JobState } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { mapJob } from '@/lib/db/mappers';
import { executionModeForActionType } from '@/lib/execution-mode';
import { getActiveOrganization } from '@/lib/organization';
import { syncToExecutor } from '@/lib/services/executor-sync';
import { fail, ok } from '@/lib/services/errors';
import type {
  AddJobRequest,
  ApiResponse,
  GraveyardFilters,
  Job,
  JobFilters,
} from '@/types/job';

function resolveInitialState(opts?: AddJobRequest['opts']): JobState {
  return opts?.delay ? JobState.delayed : JobState.waiting;
}

export async function addJob(jobData: AddJobRequest): Promise<ApiResponse<Job>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const id = randomUUID();
  const state = resolveInitialState(jobData.opts);

  const [pipeline, action] = await Promise.all([
    prisma.pipeline.findUnique({
      where: {
        organizationId_name: { organizationId: org.id, name: jobData.queueName },
      },
    }),
    prisma.action.findUnique({
      where: {
        organizationId_name: { organizationId: org.id, name: jobData.processor },
      },
    }),
  ]);
  if (!pipeline) return fail('Pipeline not found');
  if (!action) return fail('Action not found');

  const executionMode = executionModeForActionType(action.type) as ExecutionMode;

  const row = await prisma.job.create({
    data: {
      id,
      organizationId: org.id,
      pipelineName: jobData.queueName,
      actionName: jobData.processor,
      data: jobData.data ?? {},
      state,
      priority: jobData.opts?.priority ?? 0,
      maxAttempts: jobData.opts?.attempts ?? 3,
      delayMs: jobData.opts?.delay ?? 0,
      executionMode,
      metadata: {},
    },
  });

  const sync = await syncToExecutor(org.id,
    'addJob',
    {
      id,
      pipelineId: pipeline.id,
      actionId: action.id,
      queueName: jobData.queueName,
      processor: jobData.processor,
      data: jobData.data,
      opts: jobData.opts,
    },
    {
      entityId: id,
      rollback: () => prisma.job.delete({ where: { id } }),
    }
  );
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok(mapJob(row), 'Job added');
}

export async function listJobs(filters?: JobFilters): Promise<ApiResponse<Job[]>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const where: {
    organizationId: string;
    state?: JobState;
    pipelineName?: string;
    actionName?: string;
  } = { organizationId: org.id };

  if (filters?.state) where.state = filters.state as JobState;
  if (filters?.queueName) where.pipelineName = filters.queueName;
  if (filters?.processor) where.actionName = filters.processor;

  const rows = await prisma.job.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });

  let jobs = rows.map((r) => mapJob(r));
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.id.toLowerCase().includes(q) ||
        j.processor.toLowerCase().includes(q) ||
        j.queueName.toLowerCase().includes(q)
    );
  }
  return ok(jobs);
}

export async function getJob(
  id: string
): Promise<ApiResponse<Job> & { fromGraveyard?: boolean }> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');

  const active = await prisma.job.findFirst({
    where: { id, organizationId: org.id },
  });
  if (active) {
    return { success: true, data: mapJob(active), fromGraveyard: false };
  }

  const history = await prisma.jobHistory.findFirst({
    where: { id, organizationId: org.id },
  });
  if (history) {
    return {
      success: true,
      data: mapJob(history, { fromGraveyard: true }),
      fromGraveyard: true,
    };
  }

  return fail('Job not found');
}

export async function retryJob(id: string): Promise<ApiResponse<Job>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');

  const history = await prisma.jobHistory.findFirst({
    where: { id, organizationId: org.id },
  });

  if (history) {
    await prisma.job.create({
      data: {
        id: history.id,
        organizationId: org.id,
        pipelineName: history.pipelineName,
        actionName: history.actionName,
        data: history.data as object,
        state: JobState.waiting,
        priority: history.priority,
        attempts: 0,
        maxAttempts: history.maxAttempts,
        delayMs: 0,
        repeatKey: history.repeatKey,
        executionMode: history.executionMode,
        createdAt: new Date(),
        metadata: history.metadata as object,
      },
    });
    await prisma.jobHistory.delete({ where: { id } });
  } else {
    const active = await prisma.job.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!active) return fail('Job not found');
    await prisma.job.update({
      where: { id },
      data: {
        state: JobState.waiting,
        attempts: 0,
        delayMs: 0,
        processedAt: null,
      },
    });
  }

  const sync = await syncToExecutor(org.id,'retryJob', { id }, { entityId: id });
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  const refreshed = await prisma.job.findUnique({ where: { id } });
  if (refreshed) return ok(mapJob(refreshed));
  return fail('Job not found after retry');
}

export async function removeJob(id: string): Promise<ApiResponse<void>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const existing = await prisma.job.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!existing) return fail('Job not found');

  await prisma.job.delete({ where: { id } });

  const sync = await syncToExecutor(org.id,'removeJob', { id }, { entityId: id });
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok(undefined as void);
}

export async function cleanJobs(
  state: 'completed' | 'failed',
  queueName?: string
): Promise<ApiResponse<{ removed: number }>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const jobState = state === 'completed' ? JobState.completed : JobState.failed;

  const removed = await prisma.jobHistory.deleteMany({
    where: {
      organizationId: org.id,
      state: jobState,
      ...(queueName ? { pipelineName: queueName } : {}),
    },
  });

  const sync = await syncToExecutor(org.id,
    'cleanJobs',
    { state, queueName },
    { entityId: `clean:${state}:${queueName ?? '*'}` }
  );
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok({ removed: removed.count });
}

export async function listHistoryJobs(
  filters?: GraveyardFilters
): Promise<ApiResponse<Job[]>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const where: {
    organizationId: string;
    state?: JobState;
    pipelineName?: string;
  } = { organizationId: org.id };

  if (filters?.state) {
    where.state =
      filters.state === 'completed' ? JobState.completed : JobState.failed;
  }
  if (filters?.queueName) where.pipelineName = filters.queueName;

  const rows = await prisma.jobHistory.findMany({
    where,
    orderBy: { finishedAt: 'desc' },
    take: 500,
  });

  return ok(rows.map((r) => mapJob(r, { fromGraveyard: true })));
}

export async function cleanHistory(
  olderThanMs?: number
): Promise<ApiResponse<{ count: number }>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const cutoff =
    olderThanMs != null ? new Date(Date.now() - olderThanMs) : undefined;

  const removed = await prisma.jobHistory.deleteMany({
    where: {
      organizationId: org.id,
      ...(cutoff ? { finishedAt: { lt: cutoff } } : {}),
    },
  });

  const sync = await syncToExecutor(org.id,
    'cleanGraveyard',
    olderThanMs != null ? { olderThan: olderThanMs } : {},
    { entityId: `cleanGraveyard:${olderThanMs ?? 'all'}` }
  );
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok({ count: removed.count });
}

export async function testJob(id: string): Promise<ApiResponse<unknown>> {
  const jobResult = await getJob(id);
  if (!jobResult.success || !jobResult.data) {
    return fail(jobResult.error ?? 'Job not found');
  }
  const job = jobResult.data;
  const { testAction } = await import('@/lib/services/actions');
  return testAction(job.processor, job.data);
}
