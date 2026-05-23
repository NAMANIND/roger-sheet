import { Sidebar } from '@/components/sidebar';
import { getSession } from '@/lib/auth/session';
import { getUsageSnapshot } from '@/lib/services/usage';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const usage =
    session != null
      ? await getUsageSnapshot(session.organization.id, session.organization.plan)
      : null;

  return (
    <div className="flex h-full bg-background">
      <Sidebar
        user={session?.user ?? null}
        workspaceName={session?.organization.name}
        planName={session?.organization.plan.name}
        usage={usage}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
