'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CronJob } from '@/types/job';
import { getCronJobs, deleteCronJob, toggleCronJob } from '@/app/actions/cron';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { formatDate, getRelativeTime } from '@/lib/utils';

export default function CronJobsPage() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchCronJobs = async () => {
    setIsLoading(true);
    const result = await getCronJobs();
    if (result.success && result.data) {
      setCronJobs(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCronJobs();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete cron job "${name}"?`)) return;
    
    setActionInProgress(`delete-${id}`);
    await deleteCronJob(id);
    await fetchCronJobs();
    setActionInProgress(null);
  };

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    setActionInProgress(`toggle-${id}`);
    await toggleCronJob(id, !currentEnabled);
    await fetchCronJobs();
    setActionInProgress(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-gray-900">
            Scheduled Jobs
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-light">
            Manage recurring cron jobs and scheduled tasks
          </p>
        </div>
        <Link href="/cron/new">
          <Button className="font-normal">Create Cron Job</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 font-light">Loading cron jobs...</div>
        </div>
      ) : cronJobs.length === 0 ? (
        <Card className="border-gray-200 shadow-sm py-12 text-center">
          <p className="text-gray-500 font-light mb-4">
            No cron jobs yet. Create one to get started.
          </p>
          <Link href="/cron/new">
            <Button className="font-normal">Create Your First Cron Job</Button>
          </Link>
        </Card>
      ) : (
        <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Queue</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cronJobs.map((cron) => {
                const payload = typeof cron.payload === 'string' 
                  ? JSON.parse(cron.payload) 
                  : cron.payload;
                
                return (
                  <TableRow key={cron.id}>
                    <TableCell className="font-medium">{cron.name}</TableCell>
                    <TableCell>{cron.queue}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-light">
                        {cron.cronExpression.replace(/-/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs">
                      {payload.url}
                    </TableCell>
                    <TableCell>
                      {cron.enabled ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Paused</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {cron.lastRun ? getRelativeTime(cron.lastRun) : 'Never'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {cron.nextRun ? getRelativeTime(cron.nextRun) : 'Not scheduled'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggle(cron.id, cron.enabled)}
                          disabled={actionInProgress === `toggle-${cron.id}`}
                          className="font-normal"
                        >
                          {cron.enabled ? 'Pause' : 'Resume'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(cron.id, cron.name)}
                          disabled={actionInProgress === `delete-${cron.id}`}
                          className="font-normal text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
