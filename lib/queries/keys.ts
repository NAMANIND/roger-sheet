import type { GraveyardFilters, JobFilters } from '@/types/job';

export const queryKeys = {
  jobs: (filters?: JobFilters) => ['jobs', filters ?? {}] as const,
  history: (filters?: GraveyardFilters) => ['history', filters ?? {}] as const,
  processors: () => ['processors'] as const,
  schedules: (queueName?: string) => ['schedules', queueName ?? 'all'] as const,
  queueStats: () => ['queueStats'] as const,
  usage: () => ['usage'] as const,
};

export const REFETCH = {
  /** Active queue — UI reads Postgres only; run db:sync or POST /api/internal/sync to refresh */
  jobs: 8_000,
  history: 12_000,
  dashboard: 10_000,
  schedules: 15_000,
  processors: 30_000,
  usage: 12_000,
} as const;
