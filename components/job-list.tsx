'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { formatDate, getRelativeTime } from '@/lib/utils';
import { retryJob } from '@/app/actions/jobs';

interface JobListProps {
  jobs: Job[];
  onFilterChange?: (filters: JobFilters) => void;
  onRefresh?: () => void;
}

export function JobList({ jobs, onFilterChange, onRefresh }: JobListProps) {
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
        onRefresh?.();
      }
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search by URL or payload..."
          className="max-w-xs font-light"
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />
        
        <Select onValueChange={(value) => value && handleFilterChange('status', String(value))}>
          <SelectTrigger className="w-[180px] font-light">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="dead">Dead</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => value && handleFilterChange('type', String(value))}>
          <SelectTrigger className="w-[180px] font-light">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="immediate">Immediate</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="cron">Cron</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={onRefresh} variant="outline" className="font-normal">
          Refresh
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Queue</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead>Run At</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/jobs/${job.id}`} className="hover:underline">
                      {job.id.substring(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>{job.queue}</TableCell>
                  <TableCell className="capitalize">{job.type}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {job.payload.url}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell>{job.priority}</TableCell>
                  <TableCell>
                    {job.retryCount} / {job.maxRetries}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getRelativeTime(job.runAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getRelativeTime(job.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/jobs/${job.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      {(job.status === 'failed' || job.status === 'dead') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(job.id)}
                          disabled={retrying === job.id}
                        >
                          {retrying === job.id ? 'Retrying...' : 'Retry'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
