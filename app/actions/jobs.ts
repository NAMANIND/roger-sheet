'use server';

import { 
  Job, 
  CreateJobRequest, 
  ApiResponse, 
  JobFilters 
} from '@/types/job';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEB_APP_URL;

if (!APPS_SCRIPT_URL) {
  throw new Error('APPS_SCRIPT_WEB_APP_URL environment variable is not set');
}

async function callAppsScript<T>(
  action: string, 
  data?: any
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(APPS_SCRIPT_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, data }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function createJob(
  jobData: CreateJobRequest
): Promise<ApiResponse<Job>> {
  return callAppsScript<Job>('createJob', jobData);
}

export async function getJobs(
  filters?: JobFilters
): Promise<ApiResponse<Job[]>> {
  return callAppsScript<Job[]>('getJobs', filters);
}

export async function getJob(id: string): Promise<ApiResponse<Job>> {
  return callAppsScript<Job>('getJob', { id });
}

export async function retryJob(id: string): Promise<ApiResponse<Job>> {
  return callAppsScript<Job>('retryJob', { id });
}

export async function cancelJob(id: string): Promise<ApiResponse<Job>> {
  return callAppsScript<Job>('cancelJob', { id });
}

export async function deleteJob(id: string): Promise<ApiResponse<void>> {
  return callAppsScript<void>('deleteJob', { id });
}

export async function retryFailedJobs(
  queue?: string
): Promise<ApiResponse<{ count: number }>> {
  return callAppsScript<{ count: number }>('retryFailedJobs', { queue });
}

export async function clearCompletedJobs(
  queue?: string
): Promise<ApiResponse<{ count: number }>> {
  return callAppsScript<{ count: number }>('clearCompletedJobs', { queue });
}

export async function testJob(id: string): Promise<ApiResponse<{
  statusCode: number;
  statusText: string;
  responseBody: string;
  executedAt: string;
}>> {
  return callAppsScript('testJob', { id });
}
