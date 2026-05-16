'use server';

import { Queue, QueueStats, ApiResponse, WorkerStats } from '@/types/job';

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

export async function getQueues(): Promise<ApiResponse<Queue[]>> {
  return callAppsScript<Queue[]>('getQueues');
}

export async function getQueueStats(
  queueName?: string
): Promise<ApiResponse<QueueStats[]>> {
  return callAppsScript<QueueStats[]>('getQueueStats', { queueName });
}

export async function pauseQueue(
  queueName: string
): Promise<ApiResponse<void>> {
  return callAppsScript<void>('pauseQueue', { queueName });
}

export async function resumeQueue(
  queueName: string
): Promise<ApiResponse<void>> {
  return callAppsScript<void>('resumeQueue', { queueName });
}

export async function getWorkerStats(): Promise<ApiResponse<WorkerStats>> {
  return callAppsScript<WorkerStats>('getWorkerStats');
}
