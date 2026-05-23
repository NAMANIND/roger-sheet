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
import { useQueryClient } from '@tanstack/react-query';
import {
  DataTableEmpty,
  DataTableShell,
  dataTableCellClass,
  dataTableHeadClass,
} from '@/components/data-table-shell';
import { getRelativeTime } from '@/lib/utils';
import { requeueGraveyardJob, cleanGraveyard } from '@/app/actions/jobs';
import { queryKeys } from '@/lib/queries/keys';
import { RotateCcw, Copy, Trash2 } from 'lucide-react';

interface GraveyardListProps {
  jobs: Job[];
  onFilterChange?: (filters: GraveyardFilters) => void;
  onRefresh?: () => void;
}

export function GraveyardList({ jobs, onFilterChange, onRefresh }: GraveyardListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
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
        await queryClient.invalidateQueries({ queryKey: queryKeys.history() });
        await queryClient.invalidateQueries({ queryKey: queryKeys.jobs() });
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
        await queryClient.invalidateQueries({ queryKey: queryKeys.history() });
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

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className={dataTableHeadClass}>Job</TableHead>
              <TableHead className={dataTableHeadClass}>Pipeline</TableHead>
              <TableHead className={dataTableHeadClass}>Action</TableHead>
              <TableHead className={dataTableHeadClass}>Status</TableHead>
              <TableHead className={dataTableHeadClass}>Finished</TableHead>
              <TableHead className={`${dataTableHeadClass} text-right`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <DataTableEmpty
                colSpan={6}
                title="No history yet"
                description="Completed and failed jobs appear here after the executor finishes them."
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
                  <TableCell className={`${dataTableCellClass} text-muted-foreground`}>
                    {job.finishedOn ? getRelativeTime(job.finishedOn) : '—'}
                  </TableCell>
                  <TableCell className={`${dataTableCellClass} text-right`}>
                    <div className="flex gap-1.5 justify-end flex-wrap">
                      <Link href={`/queue/${job.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRequeue(job.id)}
                        disabled={busyId === job.id}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {busyId === job.id ? '…' : 'Requeue'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAndReAdd(job.id)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
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
