'use client';

import { useEffect, useState } from 'react';
import { Job, GraveyardFilters } from '@/types/job';
import { getGraveyardJobs } from '@/app/actions/jobs';
import { GraveyardList } from '@/components/graveyard-list';

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<GraveyardFilters>({});

  const fetchJobs = async () => {
    setIsLoading(true);
    const result = await getGraveyardJobs(filters);
    if (result.success && result.data) setJobs(result.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchJobs(); }, [filters]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">History</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Completed and failed jobs. Requeue to run again, or edit and re-add.
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </div>
      ) : (
        <GraveyardList jobs={jobs} onFilterChange={setFilters} onRefresh={fetchJobs} />
      )}
    </div>
  );
}
