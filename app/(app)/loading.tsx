export default function AppLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-md bg-muted" />
        <div className="h-4 w-72 rounded-md bg-muted/70" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-border bg-card" />
        ))}
      </div>
      <div className="h-64 rounded-lg border border-border bg-card" />
    </div>
  );
}
