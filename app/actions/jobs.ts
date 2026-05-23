'use server';

import {
  Job,
  AddJobRequest,
  ApiResponse,
  JobFilters,
  GraveyardFilters,
} from '@/types/job';
import * as jobService from '@/lib/services/jobs';

export async function addJob(jobData: AddJobRequest): Promise<ApiResponse<Job>> {
  return jobService.addJob(jobData);
}

export async function getJobs(filters?: JobFilters): Promise<ApiResponse<Job[]>> {
  return jobService.listJobs(filters);
}

export async function getJob(
  id: string
): Promise<ApiResponse<Job> & { fromGraveyard?: boolean }> {
  return jobService.getJob(id);
}

export async function retryJob(id: string): Promise<ApiResponse<Job>> {
  return jobService.retryJob(id);
}

export async function removeJob(id: string): Promise<ApiResponse<void>> {
  return jobService.removeJob(id);
}

export async function cleanJobs(
  state: 'completed' | 'failed',
  queueName?: string
): Promise<ApiResponse<{ removed: number }>> {
  return jobService.cleanJobs(state, queueName);
}

export async function getGraveyardJobs(
  filters?: GraveyardFilters
): Promise<ApiResponse<Job[]>> {
  return jobService.listHistoryJobs(filters);
}

export async function cleanGraveyard(
  olderThanMs?: number
): Promise<ApiResponse<{ count: number }>> {
  return jobService.cleanHistory(olderThanMs);
}

export async function requeueGraveyardJob(id: string): Promise<ApiResponse<Job>> {
  return jobService.retryJob(id);
}

export async function testJob(id: string): Promise<ApiResponse<unknown>> {
  return jobService.testJob(id);
}
