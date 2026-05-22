'use server';

import { Queue, QueueStats, ApiResponse, WorkerStats } from '@/types/job';
import { callAppsScript } from '@/lib/apps-script';

export async function createQueue(name: string): Promise<ApiResponse<Queue>> {
  return callAppsScript<Queue>('createQueue', { name });
}

export async function getQueues(): Promise<ApiResponse<Queue[]>> {
  return callAppsScript<Queue[]>('getQueues');
}

export async function getQueueStats(): Promise<ApiResponse<QueueStats[]>> {
  return callAppsScript<QueueStats[]>('getQueueStats');
}

export async function pauseQueue(name: string): Promise<ApiResponse<void>> {
  return callAppsScript<void>('pauseQueue', { name });
}

export async function resumeQueue(name: string): Promise<ApiResponse<void>> {
  return callAppsScript<void>('resumeQueue', { name });
}

export async function getWorkerStats(): Promise<ApiResponse<WorkerStats>> {
  return callAppsScript<WorkerStats>('getWorkerStats');
}
