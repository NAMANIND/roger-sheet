'use server';

import {
  Job,
  AddJobRequest,
  ApiResponse,
  JobFilters,
  GraveyardFilters,
} from '@/types/job';
import { callAppsScript } from '@/lib/apps-script';

export async function addJob(jobData: AddJobRequest): Promise<ApiResponse<Job>> {
  return callAppsScript<Job>('addJob', jobData);
}

export async function getJobs(filters?: JobFilters): Promise<ApiResponse<Job[]>> {
  return callAppsScript<Job[]>('getJobs', filters);
}

export async function getJob(
  id: string
): Promise<ApiResponse<Job> & { fromGraveyard?: boolean }> {
  return callAppsScript<Job>('getJob', { id });
}

export async function retryJob(id: string): Promise<ApiResponse<Job>> {
  return callAppsScript<Job>('retryJob', { id });
}

export async function removeJob(id: string): Promise<ApiResponse<void>> {
  return callAppsScript<void>('removeJob', { id });
}

export async function cleanJobs(
  state: 'completed' | 'failed',
  queueName?: string
): Promise<ApiResponse<{ removed: number }>> {
  return callAppsScript('cleanJobs', { state, queueName });
}

export async function getGraveyardJobs(
  filters?: GraveyardFilters
): Promise<ApiResponse<Job[]>> {
  return callAppsScript<Job[]>('getGraveyardJobs', filters);
}

export async function cleanGraveyard(
  olderThanMs?: number
): Promise<ApiResponse<{ count: number }>> {
  return callAppsScript<{ count: number }>(
    'cleanGraveyard',
    olderThanMs != null ? { olderThan: olderThanMs } : {}
  );
}

export async function requeueGraveyardJob(id: string): Promise<ApiResponse<Job>> {
  return callAppsScript<Job>('retryJob', { id });
}

/** Run the job's action with this job's payload (dry run). */
export async function testJob(id: string): Promise<ApiResponse<unknown>> {
  const jobResult = await getJob(id);
  if (!jobResult.success || !jobResult.data) {
    return { success: false, error: jobResult.error ?? 'Job not found' };
  }
  const job = jobResult.data;
  return callAppsScript('testProcessor', {
    name: job.processor,
    testData: job.data,
  });
}
