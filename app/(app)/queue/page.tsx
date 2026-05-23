'use client';

import { useState } from 'react';
import Link from 'next/link';
import { JobFilters } from '@/types/job';
import { JobList } from '@/components/job-list';
import { RepeatableJobsList } from '@/components/repeatable-jobs-list';
import { Button } from '@/components/ui/button';
import { useJobs, useSchedules } from '@/lib/queries/hooks';

export default function QueuePage() {
  const [filters, setFilters] = useState<JobFilters>({});
  const {
    data: jobs = [],
    isLoading: jobsLoading,
    isFetching: jobsFetching,
    refetch: refetchJobs,
  } = useJobs(filters);
  const {
    data: repeatableJobs = [],
    isLoading: schedulesLoading,
    refetch: refetchSchedules,
  } = useSchedules(filters.queueName);

  const isLoading = jobsLoading || schedulesLoading;

  const refetchAll = () => {
    void refetchJobs();
    void refetchSchedules();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Queue</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Active jobs from Postgres — run sync worker to refresh from Sheets
          </p>
        </div>
        <div className="flex items-center gap-2">
          {jobsFetching && !jobsLoading && (
            <span className="text-xs text-muted-foreground">Updating…</span>
          )}
          <Link href="/queue/new">
            <Button size="sm">New Job</Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <JobList jobs={jobs} onFilterChange={setFilters} onRefresh={refetchAll} />
          </section>

          {repeatableJobs.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-base font-medium text-foreground">Recurring Schedules</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Patterns that spawn new jobs automatically
                </p>
              </div>
              <RepeatableJobsList jobs={repeatableJobs} onRefresh={refetchAll} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
