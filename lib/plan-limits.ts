/** Canonical monthly run limits — keep in sync with prisma/seed.ts */
export const PLAN_RUN_LIMITS: Record<
  string,
  { pingRunsPerMonth: number | null; fullRunsPerMonth: number | null }
> = {
  free: { pingRunsPerMonth: 2000, fullRunsPerMonth: 50 },
  pro: { pingRunsPerMonth: 50000, fullRunsPerMonth: 2000 },
  enterprise: { pingRunsPerMonth: null, fullRunsPerMonth: null },
};

export function resolveRunLimits(
  planSlug: string,
  metadata: unknown
): { pingLimit: number | null; fullLimit: number | null } {
  const meta = metadata as Record<string, unknown> | null;
  const fromMeta = {
    ping:
      typeof meta?.pingRunsPerMonth === 'number' ? meta.pingRunsPerMonth : undefined,
    full:
      typeof meta?.fullRunsPerMonth === 'number' ? meta.fullRunsPerMonth : undefined,
  };

  const fallback = PLAN_RUN_LIMITS[planSlug];

  return {
    pingLimit: fromMeta.ping ?? fallback?.pingRunsPerMonth ?? null,
    fullLimit: fromMeta.full ?? fallback?.fullRunsPerMonth ?? null,
  };
}

export function remainingCount(used: number, limit: number | null): number | null {
  if (limit == null) return null;
  return Math.max(0, limit - used);
}

export function formatRemaining(used: number, limit: number | null): string {
  const remaining = remainingCount(used, limit);
  if (limit == null) return `${used.toLocaleString()} used · unlimited`;
  if (remaining === 0) return `${used.toLocaleString()} / ${limit.toLocaleString()} · none left`;
  return `${remaining.toLocaleString()} remaining of ${limit.toLocaleString()}`;
}
