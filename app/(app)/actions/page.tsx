'use client';

import { ProcessorsList } from '@/components/processors-list';
import { useProcessors } from '@/lib/queries/hooks';

export default function ActionsPage() {
  const { data: processors = [], isLoading, error, refetch, isFetching } = useProcessors();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Actions</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Reusable handlers — HTTP endpoints and scripts your jobs can execute
          </p>
        </div>
        {isFetching && !isLoading && (
          <span className="text-xs text-muted-foreground shrink-0 pt-1">Updating…</span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load actions'}
          <button type="button" onClick={() => refetch()} className="ml-3 underline">
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
        <ProcessorsList initialProcessors={processors} onReload={() => { void refetch(); }} />
      )}
    </div>
  );
}
