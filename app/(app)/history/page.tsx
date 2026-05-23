'use client';

import { useState } from 'react';
import { GraveyardList } from '@/components/graveyard-list';
import { useHistory } from '@/lib/queries/hooks';
import type { GraveyardFilters } from '@/types/job';

export default function HistoryPage() {
  const [filters, setFilters] = useState<GraveyardFilters>({});
  const { data: jobs = [], isLoading, isFetching, error, refetch } = useHistory(filters);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">History</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Completed and failed jobs from Postgres — run sync worker to refresh from Sheets
          </p>
        </div>
        {isFetching && !isLoading && (
          <span className="text-xs text-muted-foreground shrink-0 pt-1">Updating…</span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load history'}
          <button type="button" onClick={() => refetch()} className="ml-3 underline">
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Loading history…</p>
        </div>
      ) : (
        <GraveyardList
          jobs={jobs}
          onFilterChange={setFilters}
          onRefresh={() => refetch()}
        />
      )}
    </div>
  );
}
