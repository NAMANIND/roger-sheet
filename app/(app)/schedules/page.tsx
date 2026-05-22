'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RepeatableJob } from '@/types/job';
import { getRepeatableJobs } from '@/app/actions/repeatable';
import { RepeatableJobsList } from '@/components/repeatable-jobs-list';
import { Button } from '@/components/ui/button';

export default function SchedulesPage() {
  const [jobs, setJobs] = useState<RepeatableJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = async () => {
    setIsLoading(true);
    const result = await getRepeatableJobs();
    if (result.success && result.data) setJobs(result.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Schedules</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Recurring jobs that automatically create new queue entries on a pattern
          </p>
        </div>
        <Link href="/queue/new">
          <Button size="sm">New Schedule</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Loading schedules...</p>
        </div>
      ) : (
        <RepeatableJobsList jobs={jobs} onRefresh={fetchJobs} />
      )}
    </div>
  );
}
