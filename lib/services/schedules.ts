import { validateRepeatablePattern } from '@/lib/schedule-patterns';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { mapSchedule } from '@/lib/db/mappers';
import { getActiveOrganization } from '@/lib/organization';
import { syncToExecutor } from '@/lib/services/executor-sync';
import { fail, ok } from '@/lib/services/errors';
import type {
  AddRepeatableJobRequest,
  ApiResponse,
  RepeatableJob,
} from '@/types/job';

export async function addSchedule(
  jobData: AddRepeatableJobRequest
): Promise<ApiResponse<RepeatableJob>> {
  const patternError = validateRepeatablePattern(jobData.pattern);
  if (patternError) return fail(patternError);

  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');

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

  const scheduleId = randomUUID();

  const row = await prisma.schedule.create({
    data: {
      id: scheduleId,
      organizationId: org.id,
      key: scheduleId,
      pipelineName: jobData.queueName,
      actionName: jobData.processor,
      data: jobData.data ?? {},
      pattern: jobData.pattern,
      enabled: true,
      metadata: {},
    },
  });

  const sync = await syncToExecutor(org.id,'addRepeatableJob', {
    id: scheduleId,
    key: scheduleId,
    pipelineId: pipeline.id,
    actionId: action.id,
    queueName: jobData.queueName,
    processor: jobData.processor,
    data: jobData.data,
    pattern: jobData.pattern,
  }, {
    entityId: scheduleId,
    rollback: () => prisma.schedule.delete({ where: { id: row.id } }),
  });
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok(mapSchedule(row), 'Schedule created');
}

export async function listSchedules(
  queueName?: string
): Promise<ApiResponse<RepeatableJob[]>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const rows = await prisma.schedule.findMany({
    where: {
      organizationId: org.id,
      ...(queueName ? { pipelineName: queueName } : {}),
    },
    orderBy: { key: 'asc' },
  });
  return ok(rows.map(mapSchedule));
}

export async function removeSchedule(key: string): Promise<ApiResponse<void>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const row = await prisma.schedule.findUnique({
    where: { organizationId_key: { organizationId: org.id, key } },
  });
  if (!row) return fail('Schedule not found');

  await prisma.schedule.delete({ where: { id: row.id } });

  const sync = await syncToExecutor(org.id,'removeRepeatableJob', { key }, {
    entityId: key,
    rollback: () =>
      prisma.schedule.create({
        data: {
          organizationId: org.id,
          key: row.key,
          pipelineName: row.pipelineName,
          actionName: row.actionName,
          data: row.data as object,
          pattern: row.pattern,
          enabled: row.enabled,
          metadata: row.metadata as object,
          createdAt: row.createdAt,
        },
      }),
  });
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok(undefined as void);
}

export async function toggleSchedule(
  key: string,
  enabled: boolean
): Promise<ApiResponse<RepeatableJob>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const row = await prisma.schedule.findUnique({
    where: { organizationId_key: { organizationId: org.id, key } },
  });
  if (!row) return fail('Schedule not found');

  const updated = await prisma.schedule.update({
    where: { id: row.id },
    data: { enabled },
  });

  const sync = await syncToExecutor(org.id,
    'toggleRepeatableJob',
    { key, enabled },
    {
      entityId: `toggle:${key}`,
      rollback: () =>
        prisma.schedule.update({
          where: { id: row.id },
          data: { enabled: row.enabled },
        }),
    }
  );
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok(mapSchedule(updated));
}
