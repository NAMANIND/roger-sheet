'use client';

import { useCallback, useEffect, useState } from 'react';
import { getProcessors } from '@/app/actions/processors';
import { ProcessorsList } from '@/components/processors-list';
import { Processor } from '@/types/job';

export default function ActionsPage() {
  const [processors, setProcessors] = useState<Processor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getProcessors();
    if (result.success && result.data) {
      setProcessors(result.data);
    } else {
      setError(result.error ?? 'Failed to load actions');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Actions</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Reusable handlers — HTTP endpoints and scripts your jobs can execute
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button
            type="button"
            onClick={load}
            className="ml-3 underline font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-10 w-32 rounded-md bg-muted" />
          {[1, 2].map((i) => (
            <div key={i} className="h-36 rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : (
        <ProcessorsList initialProcessors={processors} onReload={load} />
      )}
    </div>
  );
}
