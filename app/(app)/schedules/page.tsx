'use client';

import Link from 'next/link';
import { RepeatableJobsList } from '@/components/repeatable-jobs-list';
import { Button } from '@/components/ui/button';
import { useSchedules } from '@/lib/queries/hooks';

export default function SchedulesPage() {
  const { data: jobs = [], isLoading, isFetching, refetch } = useSchedules();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Schedules</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Recurring jobs that automatically create new queue entries on a pattern
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <span className="text-xs text-muted-foreground">Updating…</span>
          )}
          <Link href="/queue/new">
            <Button size="sm">New Schedule</Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Loading schedules…</p>
        </div>
      ) : (
        <RepeatableJobsList jobs={jobs} onRefresh={() => refetch()} />
      )}
    </div>
  );
}
