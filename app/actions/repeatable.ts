'use server';

import { RepeatableJob, AddRepeatableJobRequest, ApiResponse } from '@/types/job';
import * as scheduleService from '@/lib/services/schedules';

export async function addRepeatableJob(
  jobData: AddRepeatableJobRequest
): Promise<ApiResponse<RepeatableJob>> {
  return scheduleService.addSchedule(jobData);
}

export async function getRepeatableJobs(
  queueName?: string
): Promise<ApiResponse<RepeatableJob[]>> {
  return scheduleService.listSchedules(queueName);
}

export async function removeRepeatableJob(
  key: string
): Promise<ApiResponse<void>> {
  return scheduleService.removeSchedule(key);
}

export async function toggleRepeatableJob(
  key: string,
  enabled: boolean
): Promise<ApiResponse<RepeatableJob>> {
  return scheduleService.toggleSchedule(key, enabled);
}
