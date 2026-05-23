'use client';

import { formatRemaining } from '@/lib/services/usage';
import { useAccountUsage } from '@/lib/queries/hooks';

export function SidebarUsageLine() {
  const { data: usage } = useAccountUsage();

  if (!usage) return null;

  return (
    <p className="px-2 pt-2 text-[10px] text-sidebar-foreground/80 leading-tight">
      Ping: {formatRemaining(usage.pingCount, usage.pingLimit)}
      <br />
      Full: {formatRemaining(usage.fullCount, usage.fullLimit)}
    </p>
  );
}
