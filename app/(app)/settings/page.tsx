import Link from 'next/link';
import { redirect } from 'next/navigation';
import { logout } from '@/app/actions/auth';
import { getSession } from '@/lib/auth/session';
import { getUsageSnapshot, formatRemaining } from '@/lib/services/usage';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function UsageBar({
  label,
  used,
  limit,
  remaining,
}: {
  label: string;
  used: number;
  limit: number | null;
  remaining: number | null;
}) {
  const pct =
    limit != null && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : null;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-4 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums text-right">
          {formatRemaining(used, limit)}
        </span>
      </div>
      {limit != null && (
        <p className="text-xs text-muted-foreground">
          {used.toLocaleString()} used
          {remaining != null && remaining > 0
            ? ` · ${remaining.toLocaleString()} left this month`
            : remaining === 0
              ? ' · monthly limit reached'
              : ''}
        </p>
      )}
      {pct != null && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlanLimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function formatCap(value: number | null | undefined): string {
  if (value == null) return 'Unlimited';
  return String(value);
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const { user, organization } = session;
  const plan = organization.plan;
  const usage = await getUsageSnapshot(organization.id, plan);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Account, workspace, and plan usage
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Signed in with email OTP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            {user.name && (
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{user.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace & plan</CardTitle>
            <CardDescription>
              {organization.name} · {plan.slug} plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {plan.description && (
              <p className="text-muted-foreground text-xs">{plan.description}</p>
            )}
            <div className="space-y-2 pt-1 border-t border-border/60">
              <PlanLimitRow label="Pipelines" value={formatCap(plan.maxPipelines)} />
              <PlanLimitRow label="Actions" value={formatCap(plan.maxActions)} />
              <PlanLimitRow label="Schedules" value={formatCap(plan.maxSchedules)} />
              <PlanLimitRow label="Team members" value={formatCap(plan.maxMembers)} />
              <PlanLimitRow
                label="History retention"
                value={plan.retentionDays != null ? `${plan.retentionDays} days` : 'Custom'}
              />
              <PlanLimitRow
                label="Ping runs / month"
                value={formatCap(usage.pingLimit)}
              />
              <PlanLimitRow
                label="Full runs / month"
                value={formatCap(usage.fullLimit)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Usage · {usage.period}</CardTitle>
            <CardDescription>
              Current billing month (UTC). Counters reset on the 1st.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <UsageBar
              label="Ping runs"
              used={usage.pingCount}
              limit={usage.pingLimit}
              remaining={usage.pingRemaining}
            />
            <UsageBar
              label="Full runs"
              used={usage.fullCount}
              limit={usage.fullLimit}
              remaining={usage.fullRemaining}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <form action={logout}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
        <Link
          href="/dashboard"
          className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-primary hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
