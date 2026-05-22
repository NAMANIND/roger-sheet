'use server';

import { RepeatableJob, AddRepeatableJobRequest, ApiResponse } from '@/types/job';
import { callAppsScript } from '@/lib/apps-script';

export async function addRepeatableJob(
  jobData: AddRepeatableJobRequest
): Promise<ApiResponse<RepeatableJob>> {
  return callAppsScript<RepeatableJob>('addRepeatableJob', jobData);
}

export async function getRepeatableJobs(
  queueName?: string
): Promise<ApiResponse<RepeatableJob[]>> {
  return callAppsScript<RepeatableJob[]>('getRepeatableJobs', { queueName });
}

export async function removeRepeatableJob(
  key: string
): Promise<ApiResponse<void>> {
  return callAppsScript<void>('removeRepeatableJob', { key });
}

export async function toggleRepeatableJob(
  key: string,
  enabled: boolean
): Promise<ApiResponse<RepeatableJob>> {
  return callAppsScript<RepeatableJob>('toggleRepeatableJob', { key, enabled });
}
