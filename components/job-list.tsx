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

  const getProcessorDisplay = (job: Job): string => {
    return job.processor;
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search jobs..."
          className="max-w-xs font-light"
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />
        
        <Select onValueChange={(value) => value && handleFilterChange('state', String(value))}>
          <SelectTrigger className="w-[180px] font-light">
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => value && handleFilterChange('queueName', String(value))}>
          <SelectTrigger className="w-[180px] font-light">
            <SelectValue placeholder="All Queues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Queues</SelectItem>
            {Array.from(new Set(jobs.map(j => j.queueName))).map(queueName => (
              <SelectItem key={queueName} value={queueName}>{queueName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={onRefresh} variant="outline" className="font-normal">
          Refresh
        </Button>
        
        <Link href="/queue/new">
          <Button className="font-normal">Add Job</Button>
        </Link>
      </div>

      <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Queue</TableHead>
              <TableHead>Processor</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/queue/${job.id}`} className="hover:underline">
                      {job.id.substring(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{job.queueName}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-mono">
                      {job.processor}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge state={job.state} />
                  </TableCell>
                  <TableCell>{job.priority}</TableCell>
                  <TableCell>
                    {job.attempts} / {job.maxAttempts}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getRelativeTime(job.timestamp)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/queue/${job.id}`}>
                        <Button variant="outline" size="sm">
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
