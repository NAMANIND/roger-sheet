'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getQueueStats } from '@/app/actions/queues';
import { getJobs, getGraveyardJobs } from '@/app/actions/jobs';
import { getRepeatableJobs } from '@/app/actions/repeatable';
import { QueueStatsCards } from '@/components/queue-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { getRelativeTime } from '@/lib/utils';
import { QueueStats, Job, RepeatableJob } from '@/types/job';

export default function DashboardPage() {
  const [stats, setStats] = useState<QueueStats[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [repeatableJobs, setRepeatableJobs] = useState<RepeatableJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [statsResult, jobsResult, historyResult, repeatableResult] = await Promise.all([
      getQueueStats(),
      getJobs({}),
      getGraveyardJobs({}),
      getRepeatableJobs(),
    ]);

    if (statsResult.success && statsResult.data) setStats(statsResult.data);
    if (jobsResult.success || historyResult.success) {
      const active = jobsResult.success && jobsResult.data ? jobsResult.data : [];
      const history =
        historyResult.success && historyResult.data ? historyResult.data : [];
      const merged = [...active, ...history].sort((a, b) => {
        const aTime = new Date(a.finishedOn ?? a.timestamp).getTime();
        const bTime = new Date(b.finishedOn ?? b.timestamp).getTime();
        return bTime - aTime;
      });
      setRecentJobs(merged.slice(0, 8));
    }
    if (repeatableResult.success && repeatableResult.data) {
      setRepeatableJobs(repeatableResult.data);
    }

    if (
      !statsResult.success &&
      !jobsResult.success &&
      !historyResult.success &&
      !repeatableResult.success
    ) {
      setError(
        statsResult.error ??
          jobsResult.error ??
          historyResult.error ??
          repeatableResult.error ??
          'Failed to load dashboard'
      );
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Overview of your job queue system
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button type="button" onClick={load} className="ml-3 underline font-medium">
            Retry
          </button>
        </div>
      )}

      <QueueStatsCards stats={stats} isLoading={isLoading} />

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Recent Jobs</CardTitle>
              <Link href="/queue" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded bg-muted" />
                ))}
              </div>
            ) : recentJobs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No jobs yet</p>
                <Link href="/queue/new" className="mt-3 inline-block">
                  <Button size="sm" variant="outline" className="text-xs">Add your first job</Button>
                </Link>
              </div>
            ) : (
              <ul className="space-y-0">
                {recentJobs.map((job) => (
                  <li key={job.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/queue/${job.id}`}
                          className="font-mono text-xs text-foreground hover:text-muted-foreground transition-colors truncate"
                        >
                          {job.id.substring(0, 8)}
                        </Link>
                        <StatusBadge state={job.state} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {job.queueName} / {job.processor}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-4 shrink-0">
                      {getRelativeTime(job.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Pipelines</CardTitle>
              <Link href="/pipelines" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Manage →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 rounded bg-muted" />
                ))}
              </div>
            ) : stats.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No pipelines yet</p>
                <Link href="/pipelines" className="mt-3 inline-block">
                  <Button size="sm" variant="outline" className="text-xs">Create pipeline</Button>
                </Link>
              </div>
            ) : (
              <ul className="space-y-0">
                {stats.map((queue) => (
                  <li key={queue.name} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{queue.name}</p>
                      <p className="text-xs text-muted-foreground">{queue.total} total</p>
                    </div>
                    <div className="text-right text-xs">
                      {queue.isPaused ? (
                        <span className="text-amber-600 font-medium">Paused</span>
                      ) : (
                        <div className="space-y-0.5">
                          {queue.waiting > 0 && <div className="text-amber-600">{queue.waiting} waiting</div>}
                          {queue.failed > 0 && <div className="text-red-500">{queue.failed} failed</div>}
                          {queue.waiting === 0 && queue.failed === 0 && (
                            <div className="text-emerald-600">Healthy</div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {!isLoading && repeatableJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">
                Active Schedules
                <span className="ml-2 text-xs font-normal text-muted-foreground">({repeatableJobs.length})</span>
              </CardTitle>
              <Link href="/schedules" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-0">
              {repeatableJobs.slice(0, 5).map((job) => (
                <li key={job.key} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono text-foreground truncate">{job.processor}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {job.queueName} · {job.pattern}
                    </p>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ml-4 ${job.enabled ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {job.enabled ? 'Active' : 'Disabled'}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
