export type JobState = 
  | 'waiting'
  | 'active' 
  | 'completed' 
  | 'failed' 
  | 'delayed';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ProcessorType = 'http' | 'script';

export interface ProcessorParamSchema {
  /** Declared parameter names (define before use in URL/body/script) */
  params?: string[];
  /** Default values used when testing this action */
  paramDefaults?: Record<string, string>;
}

export interface HttpProcessorConfig extends ProcessorParamSchema {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  urlTemplate?: boolean;
}

export interface ScriptProcessorConfig extends ProcessorParamSchema {
  script: string;
}

export type ProcessorConfig = HttpProcessorConfig | ScriptProcessorConfig;

export interface Processor {
  name: string;
  type: ProcessorType;
  config: ProcessorConfig;
  description?: string;
  createdAt: string;
}

export interface CreateProcessorRequest {
  name: string;
  type: ProcessorType;
  config: ProcessorConfig;
  description?: string;
}

export interface Job {
  id: string;
  queueName: string;
  processor: string;
  data: Record<string, any>;
  state: JobState;
  priority: number;
  attempts: number;
  maxAttempts: number;
  delay: number;
  timestamp: string;
  processedOn: string | null;
  repeatJobKey: string | null;
  // Graveyard fields (present when job is from graveyard)
  finishedOn?: string | null;
  failedReason?: string | null;
  returnvalue?: any;
}

export interface GraveyardJob extends Job {
  finishedOn: string | null;
  failedReason: string | null;
  returnvalue: any;
}

export interface AddJobRequest {
  queueName: string;
  processor: string;
  data: Record<string, any>;
  opts?: {
    priority?: number;
    delay?: number;
    attempts?: number;
  };
}

export interface JobFormPrefill {
  queueName: string;
  processor: string;
  data: Record<string, any>;
  priority?: number;
  attempts?: number;
}

export interface Queue {
  name: string;
  isPaused: boolean;
  createdAt: string;
}

export interface QueueStats {
  name: string;
  total: number;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  isPaused: boolean;
}

export interface RepeatableJob {
  key: string;
  queueName: string;
  processor: string;
  data: Record<string, any>;
  pattern: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

export interface AddRepeatableJobRequest {
  queueName: string;
  processor: string;
  data: Record<string, any>;
  pattern: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface JobFilters {
  state?: JobState;
  queueName?: string;
  name?: string;
  search?: string;
}

export interface GraveyardFilters {
  state?: 'completed' | 'failed';
  queueName?: string;
}

export interface WorkerStats {
  lastRun: string | null;
  totalProcessed: number;
  isRunning: boolean;
}

export interface CreateQueueRequest {
  name: string;
}
