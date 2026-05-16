'use client';

import { CronJob } from '@/types/job';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRelativeTime, formatDate } from '@/lib/utils';

interface CronJobsListProps {
  cronJobs: CronJob[];
}

export function CronJobsList({ cronJobs }: CronJobsListProps) {
  if (cronJobs.length === 0) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-900">Scheduled Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 font-light">No cron jobs scheduled</p>
        </CardContent>
      </Card>
    );
  }

  const activeCrons = cronJobs.filter((c) => c.enabled);
  const sortedCrons = [...activeCrons].sort((a, b) => {
    if (!a.nextRun) return 1;
    if (!b.nextRun) return -1;
    return new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime();
  });

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium text-gray-900">Scheduled Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedCrons.slice(0, 5).map((cron) => (
            <div
              key={cron.id}
              className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{cron.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {cron.cronExpression.replace(/-/g, ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 font-light mt-1">
                  Queue: {cron.queue}
                </p>
              </div>
              <div className="text-right ml-4">
                <div className="text-xs font-light text-gray-900">
                  {cron.nextRun ? getRelativeTime(cron.nextRun) : 'Not scheduled'}
                </div>
                <div className="text-xs text-gray-400 font-light">
                  next run
                </div>
              </div>
            </div>
          ))}
        </div>
        {activeCrons.length > 5 && (
          <p className="text-xs text-gray-400 font-light mt-3 text-center">
            + {activeCrons.length - 5} more scheduled
          </p>
        )}
      </CardContent>
    </Card>
  );
}
