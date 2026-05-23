import { ActionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mapAction } from '@/lib/db/mappers';
import { getActiveOrganization } from '@/lib/organization';
import { callExecutor } from '@/lib/executor';
import { syncToExecutor } from '@/lib/services/executor-sync';
import { fail, ok } from '@/lib/services/errors';
import type {
  ApiResponse,
  CreateProcessorRequest,
  Processor,
  ProcessorConfig,
  ProcessorType,
} from '@/types/job';

export async function createAction(
  request: CreateProcessorRequest
): Promise<ApiResponse<Processor>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');

  const existing = await prisma.action.findUnique({
    where: {
      organizationId_name: { organizationId: org.id, name: request.name },
    },
  });
  if (existing) return fail('Action already exists');

  const row = await prisma.action.create({
    data: {
      organizationId: org.id,
      name: request.name,
      type: request.type as ActionType,
      config: request.config as object,
      description: request.description,
      metadata: {},
    },
  });

  const sync = await syncToExecutor(org.id,'createProcessor', { id: row.id, ...request }, {
    entityId: row.id,
    rollback: () => prisma.action.delete({ where: { id: row.id } }),
  });
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok(mapAction(row), 'Action created');
}

export async function listActions(): Promise<ApiResponse<Processor[]>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const rows = await prisma.action.findMany({
    where: { organizationId: org.id },
    orderBy: { name: 'asc' },
  });
  return ok(rows.map(mapAction));
}

export async function getAction(name: string): Promise<ApiResponse<Processor>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const row = await prisma.action.findUnique({
    where: { organizationId_name: { organizationId: org.id, name } },
  });
  if (!row) return fail('Action not found');
  return ok(mapAction(row));
}

export async function updateAction(
  name: string,
  config: ProcessorConfig,
  description?: string
): Promise<ApiResponse<Processor>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const row = await prisma.action.findUnique({
    where: { organizationId_name: { organizationId: org.id, name } },
  });
  if (!row) return fail('Action not found');

  const previous = { config: row.config, description: row.description };

  const updated = await prisma.action.update({
    where: { id: row.id },
    data: {
      config: config as object,
      description: description ?? row.description,
    },
  });

  const sync = await syncToExecutor(org.id,
    'updateProcessor',
    { name, config, description },
    {
      entityId: name,
      rollback: () =>
        prisma.action.update({
          where: { id: row.id },
          data: {
            config: previous.config as object,
            description: previous.description,
          },
        }),
    }
  );
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok(mapAction(updated), 'Action updated');
}

export async function deleteAction(name: string): Promise<ApiResponse<void>> {
  const org = await getActiveOrganization();
  if (!org) return fail('Unauthorized');
  const row = await prisma.action.findUnique({
    where: { organizationId_name: { organizationId: org.id, name } },
  });
  if (!row) return fail('Action not found');

  await prisma.action.delete({ where: { id: row.id } });

  const sync = await syncToExecutor(org.id,'deleteProcessor', { name }, {
    entityId: name,
    rollback: () =>
      prisma.action.create({
        data: {
          organizationId: org.id,
          name: row.name,
          type: row.type,
          config: row.config as object,
          description: row.description,
          metadata: row.metadata as object,
          createdAt: row.createdAt,
        },
      }),
  });
  if (!sync.success) return fail(sync.error ?? 'Failed to queue executor sync');

  return ok(undefined as void);
}

/** Tests always hit executor directly (not outbox). */
export async function testAction(
  name: string,
  testData?: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  return callExecutor('testProcessor', { name, testData });
}

export async function testActionDraft(
  type: ProcessorType,
  config: Record<string, unknown>,
  testData?: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  return callExecutor('testProcessorDraft', { type, config, testData });
}
