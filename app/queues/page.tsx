'use client';

import { useEffect, useState } from 'react';
import { Queue } from '@/types/job';
import { getQueues, pauseQueue, resumeQueue } from '@/app/actions/queues';
import { clearCompletedJobs } from '@/app/actions/jobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchQueues = async () => {
    setIsLoading(true);
    const result = await getQueues();
    if (result.success && result.data) {
      setQueues(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  const handlePause = async (queueName: string) => {
    setActionInProgress(`pause-${queueName}`);
    await pauseQueue(queueName);
    await fetchQueues();
    setActionInProgress(null);
  };

  const handleResume = async (queueName: string) => {
    setActionInProgress(`resume-${queueName}`);
    await resumeQueue(queueName);
    await fetchQueues();
    setActionInProgress(null);
  };

  const handleClearCompleted = async (queueName: string) => {
    if (!confirm(`Clear all completed jobs in queue "${queueName}"?`)) {
      return;
    }
    setActionInProgress(`clear-${queueName}`);
    await clearCompletedJobs(queueName);
    await fetchQueues();
    setActionInProgress(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-gray-900">Queues</h1>
          <p className="text-gray-500 mt-1 text-sm font-light">
            Manage queue configuration and view statistics
          </p>
        </div>
        <Button onClick={fetchQueues} variant="outline" className="font-normal">
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 font-light">Loading queues...</div>
        </div>
      ) : queues.length === 0 ? (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 font-light">
              No queues found. Create a job to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Processing</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Dead</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.map((queue) => (
                <TableRow key={queue.name}>
                  <TableCell className="font-medium">{queue.name}</TableCell>
                  <TableCell>
                    {queue.isPaused ? (
                      <span className="text-yellow-600 font-medium">Paused</span>
                    ) : (
                      <span className="text-green-600 font-medium">Active</span>
                    )}
                  </TableCell>
                  <TableCell>{queue.jobCounts.pending}</TableCell>
                  <TableCell>{queue.jobCounts.processing}</TableCell>
                  <TableCell>{queue.jobCounts.completed}</TableCell>
                  <TableCell>{queue.jobCounts.failed}</TableCell>
                  <TableCell>{queue.jobCounts.dead}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {queue.isPaused ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResume(queue.name)}
                          disabled={actionInProgress === `resume-${queue.name}`}
                        >
                          Resume
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePause(queue.name)}
                          disabled={actionInProgress === `pause-${queue.name}`}
                        >
                          Pause
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClearCompleted(queue.name)}
                        disabled={
                          actionInProgress === `clear-${queue.name}` ||
                          queue.jobCounts.completed === 0
                        }
                      >
                        Clear Completed
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
