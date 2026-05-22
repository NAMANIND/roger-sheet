'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RepeatableJob } from '@/types/job';
import {
  removeRepeatableJob,
  toggleRepeatableJob,
} from '@/app/actions/repeatable';
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
import { getRelativeTime } from '@/lib/utils';

interface RepeatableJobsListProps {
  jobs: RepeatableJob[];
  onRefresh?: () => void;
  compact?: boolean;
}

export function RepeatableJobsList({
  jobs,
  onRefresh,
  compact = false,
}: RepeatableJobsListProps) {
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleDelete = async (key: string, processor: string) => {
    if (!confirm(`Delete repeatable job "${processor}" (${key})?`)) return;

    setActionInProgress(`delete-${key}`);
    await removeRepeatableJob(key);
    onRefresh?.();
    setActionInProgress(null);
  };

  const handleToggle = async (key: string, currentEnabled: boolean) => {
    setActionInProgress(`toggle-${key}`);
    await toggleRepeatableJob(key, !currentEnabled);
    onRefresh?.();
    setActionInProgress(null);
  };

  if (jobs.length === 0) {
    if (compact) return null;
    return (
      <div className="border border-gray-200 rounded-lg shadow-sm bg-white py-10 text-center">
        <p className="text-muted-foreground text-sm mb-4">
          No repeatable schedules. Create a job with Schedule → Repeatable.
        </p>
        <Link href="/queue/new">
          <Button variant="outline" className="font-normal">
            Create scheduled job
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Schedule key</TableHead>
            <TableHead>Queue</TableHead>
            <TableHead>Pattern</TableHead>
            <TableHead>Processor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last run</TableHead>
            <TableHead>Next run</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.key}>
              <TableCell className="font-mono text-xs max-w-[140px] truncate">
                {job.key}
              </TableCell>
              <TableCell className="font-medium">{job.queueName}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs font-light font-mono">
                  {job.pattern}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-mono">
                  {job.processor}
                </span>
              </TableCell>
              <TableCell>
                {job.enabled ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Paused</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {job.lastRun ? getRelativeTime(job.lastRun) : 'Never'}
              </TableCell>
              <TableCell className="text-sm">
                {job.nextRun ? getRelativeTime(job.nextRun) : '—'}
              </TableCell>
              <TableCell>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(job.key, job.enabled)}
                    disabled={actionInProgress === `toggle-${job.key}`}
                    className="font-normal"
                  >
                    {job.enabled ? 'Pause' : 'Resume'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(job.key, job.processor)}
                    disabled={actionInProgress === `delete-${job.key}`}
                    className="font-normal text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
