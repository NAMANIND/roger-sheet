import { notFound, redirect } from 'next/navigation';
import { getProcessor } from '@/app/actions/processors';
import { ProcessorForm } from '@/components/processor-form';

export const dynamic = 'force-dynamic';

export default async function EditActionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const result = await getProcessor(id);

  if (!result.success || !result.data) notFound();

  if (result.data.id !== id) {
    redirect(`/actions/${encodeURIComponent(result.data.id)}/edit`);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Edit Action</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Updating <span className="font-mono text-foreground">{result.data.name}</span>
        </p>
      </div>
      <ProcessorForm processor={result.data} />
    </div>
  );
}
