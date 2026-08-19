export default function CompanionTestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">{children}</div>
    </div>
  );
}
