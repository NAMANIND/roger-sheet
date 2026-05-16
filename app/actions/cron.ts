'use server';

import { CronJob, ApiResponse } from '@/types/job';

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

export async function getCronJobs(): Promise<ApiResponse<CronJob[]>> {
  return callAppsScript<CronJob[]>('getCronJobs');
}

export async function createCronJob(data: {
  name: string;
  queue: string;
  cronExpression: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
}): Promise<ApiResponse<CronJob>> {
  return callAppsScript<CronJob>('createCronJob', data);
}

export async function deleteCronJob(id: string): Promise<ApiResponse<void>> {
  return callAppsScript<void>('deleteCronJob', { id });
}

export async function toggleCronJob(
  id: string, 
  enabled: boolean
): Promise<ApiResponse<CronJob>> {
  return callAppsScript<CronJob>('toggleCronJob', { id, enabled });
}
