import type { Plan } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatRemaining, resolveRunLimits, remainingCount } from '@/lib/plan-limits';

export type UsageSnapshot = {
  period: string;
  pingCount: number;
  fullCount: number;
  pingLimit: number | null;
  fullLimit: number | null;
  pingRemaining: number | null;
  fullRemaining: number | null;
};

function currentPeriod(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function getUsageSnapshot(
  organizationId: string,
  plan: Plan
): Promise<UsageSnapshot> {
  const period = currentPeriod();
  const row = await prisma.usageMonthly.findUnique({
    where: { organizationId_period: { organizationId, period } },
  });
  const { pingLimit, fullLimit } = resolveRunLimits(plan.slug, plan.metadata);
  const pingCount = row?.pingCount ?? 0;
  const fullCount = row?.fullCount ?? 0;

  return {
    period,
    pingCount,
    fullCount,
    pingLimit,
    fullLimit,
    pingRemaining: remainingCount(pingCount, pingLimit),
    fullRemaining: remainingCount(fullCount, fullLimit),
  };
}

export { formatRemaining };

async function bumpUsage(
  organizationId: string,
  field: 'pingCount' | 'fullCount'
): Promise<void> {
  const period = currentPeriod();
  await prisma.usageMonthly.upsert({
    where: { organizationId_period: { organizationId, period } },
    create: {
      organizationId,
      period,
      pingCount: field === 'pingCount' ? 1 : 0,
      fullCount: field === 'fullCount' ? 1 : 0,
    },
    update: {
      [field]: { increment: 1 },
    },
  });
}

export async function incrementPingUsage(organizationId: string): Promise<void> {
  await bumpUsage(organizationId, 'pingCount');
}

export async function incrementFullUsage(organizationId: string): Promise<void> {
  await bumpUsage(organizationId, 'fullCount');
}
