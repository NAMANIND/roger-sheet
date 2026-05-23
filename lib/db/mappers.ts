import type {
  Action as DbAction,
  Job as DbJob,
  JobHistory,
  Pipeline,
  Schedule,
} from '@prisma/client';
import type {
  Job,
  JobState,
  ExecutionMode,
  Processor,
  ProcessorConfig,
  ProcessorType,
  Queue,
  RepeatableJob,
} from '@/types/job';
import { parseJobData } from '@/lib/job-data';

export function mapPipeline(row: Pipeline): Queue {
  return {
    id: row.id,
    name: row.name,
    isPaused: row.isPaused,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapAction(row: DbAction): Processor {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ProcessorType,
    config: row.config as unknown as ProcessorConfig,
    description: row.description ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapJob(
  row: DbJob | JobHistory,
  options?: { fromGraveyard?: boolean }
): Job {
  const isHistory = 'finishedAt' in row && row.finishedAt != null;
  const data = parseJobData(row.data);

  return {
    id: row.id,
    queueName: row.pipelineName,
    processor: row.actionName,
    data,
    state: row.state as JobState,
    priority: row.priority,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    delay: 'delayMs' in row ? row.delayMs : 0,
    timestamp: row.createdAt.toISOString(),
    processedOn: row.processedAt?.toISOString() ?? null,
    repeatJobKey: row.repeatKey ?? null,
    executionMode: ('executionMode' in row
      ? row.executionMode
      : 'full') as ExecutionMode,
    ...(isHistory || options?.fromGraveyard
      ? {
          finishedOn:
            'finishedAt' in row ? row.finishedAt.toISOString() : null,
          failedReason: row.failedReason ?? null,
          returnvalue: row.returnValue ?? null,
        }
      : {}),
  };
}

export function mapSchedule(row: Schedule): RepeatableJob {
  return {
    id: row.id,
    key: row.key,
    queueName: row.pipelineName,
    processor: row.actionName,
    data: parseJobData(row.data),
    pattern: row.pattern,
    enabled: row.enabled,
    lastRun: row.lastRunAt?.toISOString() ?? null,
    nextRun: row.nextRunAt?.toISOString() ?? null,
  };
}
