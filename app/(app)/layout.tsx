import { Sidebar } from '@/components/sidebar';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect('/login?session=invalid');
  }

  return (
    <div className="flex h-full bg-background">
      <Sidebar
        user={session.user}
        workspaceName={session.organization.name}
        planName={session.organization.plan.name}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
