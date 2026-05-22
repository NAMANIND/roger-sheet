'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Job, JobFilters, RepeatableJob } from '@/types/job';
import { getJobs } from '@/app/actions/jobs';
import { getRepeatableJobs } from '@/app/actions/repeatable';
import { JobList } from '@/components/job-list';
import { RepeatableJobsList } from '@/components/repeatable-jobs-list';
import { Button } from '@/components/ui/button';

export default function QueuePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [repeatableJobs, setRepeatableJobs] = useState<RepeatableJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<JobFilters>({});

  const fetchAll = async () => {
    setIsLoading(true);
    const [jobsResult, repeatableResult] = await Promise.all([
      getJobs(filters),
      getRepeatableJobs(filters.queueName),
    ]);
    if (jobsResult.success && jobsResult.data) setJobs(jobsResult.data);
    if (repeatableResult.success && repeatableResult.data) setRepeatableJobs(repeatableResult.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [filters]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Queue</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Active jobs — waiting, running, and delayed
          </p>
        </div>
        <Link href="/queue/new">
          <Button size="sm">New Job</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <JobList jobs={jobs} onFilterChange={setFilters} onRefresh={fetchAll} />
          </section>

          {repeatableJobs.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-base font-medium text-foreground">Recurring Schedules</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Patterns that spawn new jobs automatically
                </p>
              </div>
              <RepeatableJobsList jobs={repeatableJobs} onRefresh={fetchAll} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
