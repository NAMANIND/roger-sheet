'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getJob, testJob } from '@/app/actions/jobs';
import { Job } from '@/types/job';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchJob = async () => {
    setIsLoading(true);
    const result = await getJob(id);
    if (result.success && result.data) {
      setJob(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testJob(id);
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 font-light">Loading job...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 font-light">Job not found</p>
        <Link href="/jobs">
          <Button variant="outline" className="mt-4">Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-gray-900">Job Details</h1>
          <p className="text-gray-500 mt-1 text-xs font-mono">{job.id}</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleTest} 
            disabled={isTesting}
            className="font-normal bg-green-600 hover:bg-green-700"
          >
            {isTesting ? 'Testing...' : '🧪 Test Now'}
          </Button>
          <Link href="/jobs">
            <Button variant="outline" className="font-normal">Back to Jobs</Button>
          </Link>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-900">Job Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-normal text-gray-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={job.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-normal text-gray-500">Queue</dt>
              <dd className="mt-1 text-sm text-gray-900">{job.queue}</dd>
            </div>
            <div>
              <dt className="text-xs font-normal text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{job.type}</dd>
            </div>
            <div>
              <dt className="text-xs font-normal text-gray-500">Priority</dt>
              <dd className="mt-1 text-sm text-gray-900">{job.priority}</dd>
            </div>
            <div>
              <dt className="text-xs font-normal text-gray-500">Retries</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {job.retryCount} / {job.maxRetries}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-normal text-gray-500">Run At</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(job.runAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-normal text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(job.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-normal text-gray-500">Updated At</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(job.updatedAt)}</dd>
            </div>
            {job.completedAt && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Completed At
                </dt>
                <dd className="mt-1">{formatDate(job.completedAt)}</dd>
              </div>
            )}
            {job.lockedBy && (
              <>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Locked By
                  </dt>
                  <dd className="mt-1 font-mono text-sm">
                    {job.lockedBy.substring(0, 8)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Locked At
                  </dt>
                  <dd className="mt-1">{formatDate(job.lockedAt)}</dd>
                </div>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>HTTP Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">URL</dt>
            <dd className="mt-1 font-mono text-sm break-all">{job.payload.url}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Method</dt>
            <dd className="mt-1">{job.payload.method}</dd>
          </div>
          {job.payload.headers && Object.keys(job.payload.headers).length > 0 && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Headers</dt>
              <dd className="mt-1">
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(job.payload.headers, null, 2)}
                </pre>
              </dd>
            </div>
          )}
          {job.payload.body && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Body</dt>
              <dd className="mt-1">
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(job.payload.body, null, 2)}
                </pre>
              </dd>
            </div>
          )}
        </CardContent>
      </Card>

      {job.lastError && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium text-red-600">Error Details</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-red-50 p-4 rounded text-sm overflow-auto whitespace-pre-wrap">
              {job.lastError}
            </pre>
          </CardContent>
        </Card>
      )}

      {testResult && (
        <Card className={`border shadow-sm ${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader>
            <CardTitle className={`text-base font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
              Test Result {testResult.success ? '✅' : '❌'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs font-normal text-gray-600 mb-1">Status</div>
              <div className={`text-sm font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResult.data?.statusCode} {testResult.data?.statusText}
              </div>
            </div>
            
            {testResult.data?.executedAt && (
              <div>
                <div className="text-xs font-normal text-gray-600 mb-1">Executed At</div>
                <div className="text-sm text-gray-900">{formatDate(testResult.data.executedAt)}</div>
              </div>
            )}

            {testResult.data?.responseBody && (
              <div>
                <div className="text-xs font-normal text-gray-600 mb-1">Response Body</div>
                <pre className={`p-3 rounded text-xs overflow-auto ${testResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                  {testResult.data.responseBody}
                </pre>
              </div>
            )}

            {testResult.error && (
              <div>
                <div className="text-xs font-normal text-gray-600 mb-1">Error</div>
                <pre className="bg-red-100 p-3 rounded text-xs overflow-auto">
                  {testResult.error}
                </pre>
              </div>
            )}

            <div className="text-xs text-gray-500 font-light italic">
              {testResult.message}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
