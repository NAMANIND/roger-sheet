import { isExecutorId } from '@/lib/services/executor-normalize';
import { prisma } from '@/lib/prisma';

export async function resolveJobDisplayNames(
  organizationId: string,
  pipelineRef: string,
  actionRef: string
): Promise<{ pipelineName: string; actionName: string }> {
  const [pipeline, action] = await Promise.all([
    isExecutorId(pipelineRef)
      ? prisma.pipeline.findFirst({
          where: {
            organizationId,
            OR: [{ id: pipelineRef }, { name: pipelineRef }],
          },
          select: { name: true },
        })
      : prisma.pipeline.findUnique({
          where: {
            organizationId_name: { organizationId, name: pipelineRef },
          },
          select: { name: true },
        }),
    isExecutorId(actionRef)
      ? prisma.action.findFirst({
          where: {
            organizationId,
            OR: [{ id: actionRef }, { name: actionRef }],
          },
          select: { name: true },
        })
      : prisma.action.findUnique({
          where: {
            organizationId_name: { organizationId, name: actionRef },
          },
          select: { name: true },
        }),
  ]);

  return {
    pipelineName: pipeline?.name ?? pipelineRef,
    actionName: action?.name ?? actionRef,
  };
}
