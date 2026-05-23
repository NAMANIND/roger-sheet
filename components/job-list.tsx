'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Job, JobFilters } from '@/types/job';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DataTableEmpty,
  DataTableShell,
  dataTableCellClass,
  dataTableHeadClass,
} from '@/components/data-table-shell';
import { getRelativeTime } from '@/lib/utils';
import { retryJob } from '@/app/actions/jobs';
import { queryKeys } from '@/lib/queries/keys';

interface JobListProps {
  jobs: Job[];
  onFilterChange?: (filters: JobFilters) => void;
  onRefresh?: () => void;
}

export function JobList({ jobs, onFilterChange, onRefresh }: JobListProps) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<JobFilters>({});
  const [retrying, setRetrying] = useState<string | null>(null);

  const handleFilterChange = (key: keyof JobFilters, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value === 'all' ? undefined : value,
    };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleRetry = async (jobId: string) => {
    setRetrying(jobId);
    try {
      const result = await retryJob(jobId);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.jobs() });
        await queryClient.invalidateQueries({ queryKey: queryKeys.history() });
        await queryClient.invalidateQueries({ queryKey: queryKeys.queueStats() });
        onRefresh?.();
      }
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        <Input
          placeholder="Filter by queue…"
          className="max-w-[200px] h-8"
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />

        <Select onValueChange={(value) => value && handleFilterChange('state', String(value))}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => value && handleFilterChange('queueName', String(value))}>
          <SelectTrigger className="w-[160px] h-8">
            <SelectValue placeholder="Pipeline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pipelines</SelectItem>
            {Array.from(new Set(jobs.map((j) => j.queueName))).map((queueName) => (
              <SelectItem key={queueName} value={queueName}>
                {queueName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button onClick={onRefresh} variant="outline" size="sm">
          Refresh
        </Button>
        <Link href="/queue/new">
          <Button size="sm">Add job</Button>
        </Link>
      </div>

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className={dataTableHeadClass}>Job</TableHead>
              <TableHead className={dataTableHeadClass}>Pipeline</TableHead>
              <TableHead className={dataTableHeadClass}>Action</TableHead>
              <TableHead className={dataTableHeadClass}>Status</TableHead>
              <TableHead className={dataTableHeadClass}>Priority</TableHead>
              <TableHead className={dataTableHeadClass}>Attempts</TableHead>
              <TableHead className={dataTableHeadClass}>Created</TableHead>
              <TableHead className={`${dataTableHeadClass} text-right`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <DataTableEmpty
                colSpan={8}
                title="No jobs in queue"
                description="Add a job or wait for a schedule to enqueue one."
              />
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id} className="border-b border-border/60">
                  <TableCell className={`${dataTableCellClass} font-mono text-xs`}>
                    <Link
                      href={`/queue/${job.id}`}
                      className="text-foreground hover:text-primary transition-colors"
                    >
                      {job.id.substring(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell className={`${dataTableCellClass} font-medium`}>
                    {job.queueName}
                  </TableCell>
                  <TableCell className={dataTableCellClass}>
                    <code className="text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                      {job.processor}
                    </code>
                  </TableCell>
                  <TableCell className={dataTableCellClass}>
                    <StatusBadge state={job.state} />
                  </TableCell>
                  <TableCell className={`${dataTableCellClass} tabular-nums text-muted-foreground`}>
                    {job.priority}
                  </TableCell>
                  <TableCell className={`${dataTableCellClass} tabular-nums text-muted-foreground`}>
                    {job.attempts}/{job.maxAttempts}
                  </TableCell>
                  <TableCell className={`${dataTableCellClass} text-muted-foreground`}>
                    {getRelativeTime(job.timestamp)}
                  </TableCell>
                  <TableCell className={`${dataTableCellClass} text-right`}>
                    <div className="flex gap-1.5 justify-end">
                      <Link href={`/queue/${job.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                      {job.state === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(job.id)}
                          disabled={retrying === job.id}
                        >
                          {retrying === job.id ? '…' : 'Retry'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  );
}
