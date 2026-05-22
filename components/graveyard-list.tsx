'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Job, GraveyardFilters } from '@/types/job';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
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
import { getRelativeTime } from '@/lib/utils';
import { requeueGraveyardJob, cleanGraveyard } from '@/app/actions/jobs';
import { RotateCcw, Copy, Trash2 } from 'lucide-react';

interface GraveyardListProps {
  jobs: Job[];
  onFilterChange?: (filters: GraveyardFilters) => void;
  onRefresh?: () => void;
}

export function GraveyardList({ jobs, onFilterChange, onRefresh }: GraveyardListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<GraveyardFilters>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const handleFilterChange = (key: keyof GraveyardFilters, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value === 'all' ? undefined : value,
    };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleRequeue = async (jobId: string) => {
    setBusyId(jobId);
    try {
      const result = await requeueGraveyardJob(jobId);
      if (result.success) {
        onRefresh?.();
        router.push('/queue');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleEditAndReAdd = (jobId: string) => {
    router.push(`/queue/new?from=${encodeURIComponent(jobId)}`);
  };

  const handleClean = async (olderThanMs?: number) => {
    const label = olderThanMs
      ? 'Remove graveyard jobs older than 7 days?'
      : 'Remove ALL graveyard jobs? This cannot be undone.';
    if (!confirm(label)) return;

    setIsCleaning(true);
    try {
      const result = await cleanGraveyard(olderThanMs);
      if (result.success) {
        onRefresh?.();
      }
    } finally {
      setIsCleaning(false);
    }
  };

  const queueNames = Array.from(new Set(jobs.map((j) => j.queueName)));

  return (
    <div className="space-y-5">
      <div className="flex gap-3 flex-wrap items-center">
        <Select
          onValueChange={(value) =>
            value && handleFilterChange('state', String(value))
          }
        >
          <SelectTrigger className="w-[180px] font-light">
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) =>
            value && handleFilterChange('queueName', String(value))
          }
        >
          <SelectTrigger className="w-[180px] font-light">
            <SelectValue placeholder="All Queues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Queues</SelectItem>
            {queueNames.map((queueName) => (
              <SelectItem key={queueName} value={queueName}>
                {queueName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={onRefresh} variant="outline" className="font-normal">
          Refresh
        </Button>

        <Button
          variant="outline"
          disabled={isCleaning || jobs.length === 0}
          onClick={() => handleClean(7 * 24 * 60 * 60 * 1000)}
          className="font-normal"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clean 7d+
        </Button>

        <Button
          variant="outline"
          disabled={isCleaning || jobs.length === 0}
          onClick={() => handleClean()}
          className="font-normal text-red-600 hover:text-red-700"
        >
          Clear All
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Queue</TableHead>
              <TableHead>Processor</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Finished</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No archived jobs
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
                  <TableCell className="text-sm">
                    {job.finishedOn
                      ? getRelativeTime(job.finishedOn)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      <Link href={`/queue/${job.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRequeue(job.id)}
                        disabled={busyId === job.id}
                        title="Move back to queue with same job ID"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {busyId === job.id ? '...' : 'Requeue'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAndReAdd(job.id)}
                        title="Pre-fill create form — edit data, then submit"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Edit & re-add
                      </Button>
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
