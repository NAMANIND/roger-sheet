import { Sidebar } from '@/components/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
