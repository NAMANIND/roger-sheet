'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { cn } from '@/lib/utils';

type SidebarUserProps = {
  name: string | null;
  email: string;
  workspaceName: string;
  planName: string;
  className?: string;
};

function initials(name: string | null, email: string): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
  return email[0]?.toUpperCase() ?? '?';
}

export function SidebarUser({
  name,
  email,
  workspaceName,
  planName,
  className,
}: SidebarUserProps) {
  const label = name?.trim() || email;

  return (
    <div className={cn('mt-3 pt-3 border-t border-sidebar-border space-y-1', className)}>
      <Link
        href="/settings"
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/60 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0 ring-1 ring-sidebar-border">
          <span className="text-sidebar-foreground text-[10px] font-medium">
            {initials(name, email)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-sidebar-accent-foreground font-medium truncate leading-tight">
            {label}
          </p>
          <p className="text-[10px] text-sidebar-foreground truncate leading-tight">
            {workspaceName} · {planName}
          </p>
        </div>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 px-2 py-1.5 rounded-md text-sm text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60 transition-colors"
        >
          <LogOut size={15} strokeWidth={1.5} />
          Sign out
        </button>
      </form>
    </div>
  );
}
