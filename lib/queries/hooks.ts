'use client';

import { useQuery } from '@tanstack/react-query';
import { getJobs, getGraveyardJobs } from '@/app/actions/jobs';
import { getProcessors } from '@/app/actions/processors';
import { getRepeatableJobs } from '@/app/actions/repeatable';
import { getQueueStats } from '@/app/actions/queues';
import { getAccountUsage } from '@/app/actions/account';
import { queryKeys, REFETCH } from '@/lib/queries/keys';
import type { GraveyardFilters, JobFilters } from '@/types/job';

function unwrap<T>(result: { success: boolean; data?: T; error?: string }): T {
  if (!result.success) throw new Error(result.error ?? 'Request failed');
  return result.data as T;
}

export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: queryKeys.jobs(filters),
    queryFn: async () => unwrap(await getJobs(filters)),
    refetchInterval: REFETCH.jobs,
  });
}

export function useHistory(filters?: GraveyardFilters) {
  return useQuery({
    queryKey: queryKeys.history(filters),
    queryFn: async () => unwrap(await getGraveyardJobs(filters)),
    refetchInterval: REFETCH.history,
  });
}

export function useProcessors() {
  return useQuery({
    queryKey: queryKeys.processors(),
    queryFn: async () => unwrap(await getProcessors()),
    refetchInterval: REFETCH.processors,
  });
}

export function useSchedules(queueName?: string) {
  return useQuery({
    queryKey: queryKeys.schedules(queueName),
    queryFn: async () => unwrap(await getRepeatableJobs(queueName)),
    refetchInterval: REFETCH.schedules,
  });
}

export function useQueueStats() {
  return useQuery({
    queryKey: queryKeys.queueStats(),
    queryFn: async () => unwrap(await getQueueStats()),
    refetchInterval: REFETCH.dashboard,
  });
}

export function useAccountUsage(enabled = true) {
  return useQuery({
    queryKey: queryKeys.usage(),
    queryFn: async () => unwrap(await getAccountUsage()),
    enabled,
    refetchInterval: REFETCH.usage,
  });
}

export function useDashboardData() {
  const stats = useQueueStats();
  const jobs = useJobs({});
  const history = useHistory({});
  const schedules = useSchedules();

  const isLoading =
    stats.isLoading || jobs.isLoading || history.isLoading || schedules.isLoading;

  const error =
    stats.error ?? jobs.error ?? history.error ?? schedules.error ?? null;

  return { stats, jobs, history, schedules, isLoading, error };
}
