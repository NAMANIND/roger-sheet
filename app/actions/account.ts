'use server';

import { getSession } from '@/lib/auth/session';
import { getUsageSnapshot } from '@/lib/services/usage';
import { fail, ok } from '@/lib/services/errors';
import type { UsageSnapshot } from '@/lib/services/usage';
import type { ApiResponse } from '@/types/job';

export async function getAccountUsage(): Promise<ApiResponse<UsageSnapshot>> {
  const session = await getSession();
  if (!session) return fail('Unauthorized');
  const usage = await getUsageSnapshot(
    session.organization.id,
    session.organization.plan
  );
  return ok(usage);
}
