'use server';

import { Queue, QueueStats, ApiResponse, UsageDayStats, WorkerStats } from '@/types/job';
import * as pipelineService from '@/lib/services/pipelines';

export async function createQueue(name: string): Promise<ApiResponse<Queue>> {
  return pipelineService.createPipeline(name);
}

export async function getQueues(): Promise<ApiResponse<Queue[]>> {
  return pipelineService.listPipelines();
}

export async function getQueueStats(): Promise<ApiResponse<QueueStats[]>> {
  return pipelineService.getPipelineStats();
}

export async function pauseQueue(name: string): Promise<ApiResponse<void>> {
  return pipelineService.pausePipeline(name);
}

export async function resumeQueue(name: string): Promise<ApiResponse<void>> {
  return pipelineService.resumePipeline(name);
}

export async function getWorkerStats(): Promise<ApiResponse<WorkerStats>> {
  return pipelineService.getWorkerStats();
}

export async function getUsageStats(
  days = 30
): Promise<ApiResponse<{ days: UsageDayStats[]; today: UsageDayStats | null }>> {
  return pipelineService.getUsageStats(days);
}
