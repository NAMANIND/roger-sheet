import type { ExecutionMode, ProcessorType } from '@/types/job';

export function executionModeForActionType(type: ProcessorType | string): ExecutionMode {
  return type === 'http_ping' ? 'ping' : 'full';
}

export function isPingJob(mode: ExecutionMode | string | undefined): boolean {
  return mode === 'ping';
}
