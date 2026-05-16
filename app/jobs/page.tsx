'use client';

import { useEffect, useState } from 'react';
import { Job, JobFilters } from '@/types/job';
import { getJobs } from '@/app/actions/jobs';
import { JobList } from '@/components/job-list';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<JobFilters>({});

  const fetchJobs = async () => {
    setIsLoading(true);
    const result = await getJobs(filters);
    if (result.success && result.data) {
      setJobs(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1 text-sm font-light">
            View and manage all jobs in the queue system
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 font-light">Loading jobs...</div>
        </div>
      ) : (
        <JobList
          jobs={jobs}
          onFilterChange={setFilters}
          onRefresh={fetchJobs}
        />
      )}
    </div>
  );
}
