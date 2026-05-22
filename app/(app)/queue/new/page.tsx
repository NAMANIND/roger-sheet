import { Suspense } from 'react';
import { JobFormLoader } from '@/components/job-form-loader';

export default function NewJobPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">New Job</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure and queue a job for execution
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading form...</p>}>
        <JobFormLoader />
      </Suspense>
    </div>
  );
}
