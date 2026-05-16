export type JobStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'delayed' 
  | 'dead';

export type JobType = 'immediate' | 'delayed' | 'cron';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface HttpPayload {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
}

export interface Job {
  id: string;
  queue: string;
  type: JobType;
  payload: HttpPayload;
  status: JobStatus;
  priority: number;
  retryCount: number;
  maxRetries: number;
  runAt: string;
  lockedBy: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
  completedAt: string | null;
}

export interface CreateJobRequest {
  queue: string;
  type: JobType;
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  priority?: number;
  maxRetries?: number;
  runAt?: Date | string;
}

export interface QueueStats {
  name: string;
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  dead: number;
  isPaused: boolean;
}

export interface Queue {
  name: string;
  isPaused: boolean;
  jobCounts: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    dead: number;
  };
}

export interface CronJob {
  id: string;
  name: string;
  queue: string;
  cronExpression: string;
  payload: HttpPayload;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface JobFilters {
  status?: JobStatus;
  queue?: string;
  type?: JobType;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface WorkerStats {
  lastRun: string | null;
  totalProcessed: number;
  isRunning: boolean;
}
