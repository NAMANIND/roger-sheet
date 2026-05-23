'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pauseQueue, resumeQueue, createQueue } from '@/app/actions/queues';
import { cleanJobs } from '@/app/actions/jobs';
import { useQueueStats } from '@/lib/queries/hooks';
import { queryKeys } from '@/lib/queries/keys';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function PipelinesPage() {
  const queryClient = useQueryClient();
  const { data: stats = [], isLoading, refetch } = useQueueStats();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchStats = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.queueStats() });
    await refetch();
  };

  const handlePause = async (name: string) => {
    setActionInProgress(`pause-${name}`);
    await pauseQueue(name);
    await fetchStats();
    setActionInProgress(null);
  };

  const handleResume = async (name: string) => {
    setActionInProgress(`resume-${name}`);
    await resumeQueue(name);
    await fetchStats();
    setActionInProgress(null);
  };

  const handleClean = async (type: 'completed' | 'failed', name: string) => {
    if (!confirm(`Clear all ${type} jobs in pipeline "${name}"?`)) return;
    setActionInProgress(`clean-${type}-${name}`);
    await cleanJobs(type, name);
    await fetchStats();
    setActionInProgress(null);
  };

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newQueueName.trim()) { setCreateError('Name is required'); return; }
    const result = await createQueue(newQueueName.trim());
    if (result.success) {
      setIsCreateDialogOpen(false);
      setNewQueueName('');
      await fetchStats();
    } else {
      setCreateError(result.error ?? 'Failed to create pipeline');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pipelines</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Group and control your job pipelines. Pause to halt a pipeline without touching individual jobs.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger className={cn(buttonVariants({ size: 'sm' }))}>
              New Pipeline
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateQueue}>
                <DialogHeader>
                  <DialogTitle>Create Pipeline</DialogTitle>
                  <DialogDescription>
                    Add a named pipeline to group and control related jobs.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                  <Label htmlFor="pipelineName">Name</Label>
                  <Input
                    id="pipelineName"
                    value={newQueueName}
                    onChange={(e) => setNewQueueName(e.target.value)}
                    placeholder="e.g. emails, webhooks, reports"
                    required
                  />
                  {createError && <p className="text-sm text-destructive">{createError}</p>}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button onClick={fetchStats} variant="outline" size="sm">Refresh</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Loading pipelines...</p>
        </div>
      ) : stats.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground mb-4">No pipelines yet.</p>
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>Create your first pipeline</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pipeline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Waiting</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Delayed</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((queue) => (
                <TableRow key={queue.name}>
                  <TableCell className="font-medium">{queue.name}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      queue.isPaused
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {queue.isPaused ? 'Paused' : 'Active'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{queue.waiting}</TableCell>
                  <TableCell className="text-sm">{queue.active}</TableCell>
                  <TableCell className="text-sm">{queue.delayed}</TableCell>
                  <TableCell className={`text-sm ${queue.failed > 0 ? 'text-red-600 font-medium' : ''}`}>
                    {queue.failed}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{queue.total}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5 flex-wrap">
                      {queue.isPaused ? (
                        <Button variant="outline" size="sm" className="text-xs h-7"
                          onClick={() => handleResume(queue.name)}
                          disabled={actionInProgress === `resume-${queue.name}`}>
                          Resume
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="text-xs h-7"
                          onClick={() => handlePause(queue.name)}
                          disabled={actionInProgress === `pause-${queue.name}`}>
                          Pause
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="text-xs h-7"
                        onClick={() => handleClean('failed', queue.name)}
                        disabled={actionInProgress === `clean-failed-${queue.name}` || queue.failed === 0}>
                        Clear failed
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
