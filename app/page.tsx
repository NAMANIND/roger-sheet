import Link from 'next/link';
import { getQueueStats } from '@/app/actions/queues';
import { getJobs } from '@/app/actions/jobs';
import { getCronJobs } from '@/app/actions/cron';
import { QueueStatsCards } from '@/components/queue-stats';
import { CronJobsList } from '@/components/cron-jobs-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { getRelativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [statsResult, jobsResult, cronResult] = await Promise.all([
    getQueueStats(),
    getJobs({ status: undefined }),
    getCronJobs(),
  ]);

  const stats = statsResult.success ? statsResult.data || [] : [];
  const allJobs = jobsResult.success ? jobsResult.data || [] : [];
  const cronJobs = cronResult.success ? cronResult.data || [] : [];
  const recentJobs = allJobs.slice(0, 10);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm font-light">
          Monitor and manage your job queue processing system
        </p>
      </div>

      <QueueStatsCards stats={stats} />

      {cronJobs.length > 0 && (
        <CronJobsList cronJobs={cronJobs} />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium text-gray-900">Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentJobs.length === 0 ? (
                <p className="text-sm text-gray-500 font-light">No jobs yet</p>
              ) : (
                recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="font-mono text-xs text-gray-600 hover:text-gray-900 transition-colors truncate"
                        >
                          {job.id.substring(0, 8)}
                        </Link>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="text-xs text-gray-500 font-light truncate mt-1">
                        {job.payload.url}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 font-light ml-4">
                      {getRelativeTime(job.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-5">
              <Link href="/jobs">
                <Button variant="outline" className="w-full font-normal text-sm">
                  View All Jobs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium text-gray-900">Queue Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.length === 0 ? (
                <p className="text-sm text-gray-500 font-light">No queues yet</p>
              ) : (
                stats.map((queue) => (
                  <div
                    key={queue.name}
                    className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0"
                  >
                    <div>
                      <div className="font-medium text-sm text-gray-900">{queue.name}</div>
                      <div className="text-xs text-gray-500 font-light">
                        {queue.total} total jobs
                      </div>
                    </div>
                    <div className="text-right text-xs font-light">
                      <div className="text-amber-600">{queue.pending} pending</div>
                      <div className="text-red-600">
                        {queue.failed + queue.dead} failed
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-5">
              <Link href="/queues">
                <Button variant="outline" className="w-full font-normal text-sm">
                  Manage Queues
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
