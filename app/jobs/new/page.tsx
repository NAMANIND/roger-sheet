import { JobForm } from '@/components/job-form';

export default function NewJobPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-gray-900">Create New Job</h1>
        <p className="text-gray-500 mt-1 text-sm font-light">
          Configure and schedule a new job for execution
        </p>
      </div>

      <JobForm />
    </div>
  );
}
