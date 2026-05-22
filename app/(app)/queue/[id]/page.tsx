'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getJob, testJob, requeueGraveyardJob } from '@/app/actions/jobs';
import { Job } from '@/types/job';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { ExecutionOutput } from '@/components/execution-output';
import { formatDate } from '@/lib/utils';
import { formatDisplayJson, parseJobData } from '@/lib/job-data';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [fromGraveyard, setFromGraveyard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isRequeuing, setIsRequeuing] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    data?: unknown;
    error?: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const result = await getJob(id);
      if (result.success && result.data) {
        setJob(result.data);
        setFromGraveyard(!!result.fromGraveyard);
      }
      setIsLoading(false);
    })();
  }, [id]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      setTestResult(await testJob(id));
    } finally {
      setIsTesting(false);
    }
  };

  const handleRequeue = async () => {
    setIsRequeuing(true);
    try {
      const result = await requeueGraveyardJob(id);
      if (result.success) router.push('/queue');
    } finally {
      setIsRequeuing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Loading job...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Job not found</p>
        <Link href="/queue" className="mt-4 inline-block">
          <Button variant="outline" size="sm">Back to Queue</Button>
        </Link>
      </div>
    );
  }

  const payload = parseJobData(job.data);
  const showReturnValue =
    fromGraveyard ||
    job.state === 'completed' ||
    job.returnvalue != null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {fromGraveyard ? 'History — Job Details' : 'Job Details'}
          </h1>
          <p className="text-muted-foreground mt-1 text-xs font-mono">{job.id}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {fromGraveyard ? (
            <>
              <Button onClick={handleRequeue} disabled={isRequeuing} size="sm">
                {isRequeuing ? 'Working…' : 'Requeue'}
              </Button>
              <Button
                onClick={() => router.push(`/queue/new?from=${encodeURIComponent(id)}`)}
                variant="outline"
                size="sm"
              >
                Edit & re-add
              </Button>
            </>
          ) : (
            <Button
              onClick={handleTest}
              disabled={isTesting}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isTesting ? 'Testing…' : 'Test Now'}
            </Button>
          )}
          <Link href={fromGraveyard ? '/history' : '/queue'}>
            <Button variant="outline" size="sm">
              {fromGraveyard ? '← History' : '← Queue'}
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Job Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <dt className="text-xs text-muted-foreground">State</dt>
              <dd className="mt-1"><StatusBadge state={job.state} /></dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pipeline</dt>
              <dd className="mt-1 text-sm font-medium">{job.queueName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Action</dt>
              <dd className="mt-1 text-sm font-mono">{job.processor}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Priority</dt>
              <dd className="mt-1 text-sm">{job.priority}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Attempts</dt>
              <dd className="mt-1 text-sm">{job.attempts} / {job.maxAttempts}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Delay</dt>
              <dd className="mt-1 text-sm">
                {job.delay > 0 ? `${Math.floor(job.delay / 1000)}s` : 'None'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd className="mt-1 text-sm">{formatDate(job.timestamp)}</dd>
            </div>
            {job.processedOn && (
              <div>
                <dt className="text-xs text-muted-foreground">Started</dt>
                <dd className="mt-1 text-sm">{formatDate(job.processedOn)}</dd>
              </div>
            )}
            {job.finishedOn && (
              <div>
                <dt className="text-xs text-muted-foreground">Finished</dt>
                <dd className="mt-1 text-sm">{formatDate(job.finishedOn)}</dd>
              </div>
            )}
            {job.repeatJobKey && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Schedule Key</dt>
                <dd className="mt-1 text-sm font-mono">{job.repeatJobKey}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted rounded-md p-4 text-xs overflow-auto max-h-80 whitespace-pre-wrap font-mono">
            {formatDisplayJson(payload)}
          </pre>
        </CardContent>
      </Card>

      {job.failedReason && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-red-50 rounded-md p-4 text-xs overflow-auto whitespace-pre-wrap font-mono text-red-800">
              {job.failedReason}
            </pre>
          </CardContent>
        </Card>
      )}

      {showReturnValue && (
        <ExecutionOutput
          title="Return value"
          value={job.returnvalue}
          borderClassName="border-emerald-200"
          titleClassName="text-emerald-700"
          emptyMessage="No return value recorded."
        />
      )}

      {testResult && (
        <div className="space-y-4">
          <h2
            className={`text-sm font-medium ${
              testResult.success ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            Test {testResult.success ? 'passed' : 'failed'}
          </h2>
          {testResult.success && testResult.data != null ? (
            <ExecutionOutput
              title="Test output"
              value={testResult.data}
              borderClassName="border-emerald-200"
              titleClassName="text-emerald-700"
            />
          ) : null}
          {testResult.error && (
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-600">
                  Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-red-50 rounded-md p-4 text-xs overflow-auto whitespace-pre-wrap font-mono text-red-800">
                  {testResult.error}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
