'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getJob } from '@/app/actions/jobs';
import { JobFormPrefill } from '@/types/job';
import { JobForm } from '@/components/job-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function JobFormLoader() {
  const searchParams = useSearchParams();
  const fromId = searchParams.get('from');
  const [prefill, setPrefill] = useState<JobFormPrefill | undefined>();
  const [sourceJobId, setSourceJobId] = useState<string | undefined>();
  const [loading, setLoading] = useState(!!fromId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fromId) {
      setLoading(false);
      return;
    }

    (async () => {
      const result = await getJob(fromId);
      if (result.success && result.data) {
        const job = result.data;
        const data =
          typeof job.data === 'string'
            ? JSON.parse(job.data as unknown as string)
            : job.data;

        setPrefill({
          queueName: job.queueName,
          processor: job.processor,
          data: data ?? {},
          priority: job.priority,
          attempts: job.maxAttempts,
        });
        setSourceJobId(job.id);
      } else {
        setError(result.error || 'Job not found');
      }
      setLoading(false);
    })();
  }, [fromId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-light">Loading job...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Preparing form from graveyard job</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-600 text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return <JobForm prefill={prefill} sourceJobId={sourceJobId} />;
}
