'use server';

import { getSession } from '@/lib/auth/session';
import { syncPullFromExecutor } from '@/lib/services/sync-pull';
import { fail, ok } from '@/lib/services/errors';
import type { ApiResponse } from '@/types/job';
import type { PullSyncStats } from '@/lib/services/sync-pull';

/** Pull completed/failed jobs from the executor into Postgres for the active workspace. */
export async function pullFromExecutor(): Promise<
  ApiResponse<{ stats: PullSyncStats }>
> {
  const session = await getSession();
  if (!session) return fail('Unauthorized');
  return syncPullFromExecutor();
}
