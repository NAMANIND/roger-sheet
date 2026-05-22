import { ProcessorForm } from '@/components/processor-form';

export default function NewActionPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">New Action</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Define a reusable handler for your jobs — HTTP call or script
        </p>
      </div>
      <ProcessorForm />
    </div>
  );
}
