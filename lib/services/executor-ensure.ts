import type { Action, Pipeline } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { listSyncOrganizations } from '@/lib/organization';
import { syncToExecutor } from '@/lib/services/executor-sync';

export async function ensurePipelineOnExecutor(
  organizationId: string,
  pipeline: Pick<Pipeline, 'id' | 'name'>
): Promise<void> {
  await syncToExecutor(
    organizationId,
    'createQueue',
    { id: pipeline.id, name: pipeline.name },
    { entityId: `ensure-pipeline:${pipeline.id}` }
  );
}

export async function ensureActionOnExecutor(
  organizationId: string,
  action: Pick<Action, 'id' | 'name' | 'type' | 'config' | 'description'>
): Promise<void> {
  await syncToExecutor(
    organizationId,
    'createProcessor',
    {
      id: action.id,
      name: action.name,
      type: action.type,
      config: action.config,
      description: action.description ?? '',
    },
    { entityId: `ensure-action:${action.id}` }
  );
}

/** Push Postgres pipelines/actions to Sheets so jobs can resolve IDs at pickup. */
export async function reconcileExecutorEntities(): Promise<{
  pipelines: number;
  actions: number;
}> {
  const orgs = await listSyncOrganizations();
  let pipelines = 0;
  let actions = 0;

  for (const org of orgs) {
    const [pipelineRows, actionRows] = await Promise.all([
      prisma.pipeline.findMany({ where: { organizationId: org.id } }),
      prisma.action.findMany({ where: { organizationId: org.id } }),
    ]);

    for (const pipeline of pipelineRows) {
      await ensurePipelineOnExecutor(org.id, pipeline);
      pipelines++;
    }
    for (const action of actionRows) {
      await ensureActionOnExecutor(org.id, action);
      actions++;
    }
  }

  return { pipelines, actions };
}
