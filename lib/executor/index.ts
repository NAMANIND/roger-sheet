import type { ApiResponse } from '@/types/job';
import { callAppsScript } from '@/lib/executor/apps-script';

export type ExecutorAction =
  | 'createQueue'
  | 'getQueues'
  | 'pauseQueue'
  | 'resumeQueue'
  | 'getQueueStats'
  | 'getWorkerStats'
  | 'getUsageStats'
  | 'createProcessor'
  | 'getProcessors'
  | 'getProcessor'
  | 'updateProcessor'
  | 'deleteProcessor'
  | 'addJob'
  | 'getJobs'
  | 'getJob'
  | 'retryJob'
  | 'removeJob'
  | 'cleanJobs'
  | 'getGraveyardJobs'
  | 'cleanGraveyard'
  | 'addRepeatableJob'
  | 'getRepeatableJobs'
  | 'removeRepeatableJob'
  | 'toggleRepeatableJob'
  | 'testProcessor'
  | 'testProcessorDraft'
  | 'runPingJob';

/**
 * Internal execution plane — forwards to Apps Script when configured.
 */
export async function callExecutor<T>(
  action: ExecutorAction,
  data?: unknown
): Promise<ApiResponse<T>> {
  if (!process.env.APPS_SCRIPT_WEB_APP_URL) {
    return {
      success: false,
      error: 'Execution backend not configured (APPS_SCRIPT_WEB_APP_URL)',
    };
  }
  return callAppsScript<T>(action, data);
}

export function isExecutorConfigured(): boolean {
  return Boolean(process.env.APPS_SCRIPT_WEB_APP_URL);
}
