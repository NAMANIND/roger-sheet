'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListTodo,
  CalendarClock,
  Zap,
  GitFork,
  Archive,
  Plus,
  Settings,
} from 'lucide-react';
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand';
import { cn } from '@/lib/utils';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
};

type NavSection = {
  heading?: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard, exact: true },
      { label: 'Queue', href: '/queue', icon: ListTodo },
      { label: 'Schedules', href: '/schedules', icon: CalendarClock },
    ],
  },
  {
    heading: 'Configuration',
    items: [
      { label: 'Actions', href: '/actions', icon: Zap },
      { label: 'Pipelines', href: '/pipelines', icon: GitFork },
    ],
  },
  {
    heading: 'Logs',
    items: [
      { label: 'History', href: '/history', icon: Archive },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="flex flex-col w-60 shrink-0 h-full bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-sidebar-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-sm">
          <span className="text-sidebar-primary-foreground font-bold text-xs leading-none">
            D
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sidebar-accent-foreground font-semibold text-sm tracking-tight leading-tight">
            {PRODUCT_NAME}
          </p>
          <p className="text-[10px] text-sidebar-foreground truncate leading-tight">
            {PRODUCT_TAGLINE}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section, i) => (
          <div key={i}>
            {section.heading && (
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/70">
                {section.heading}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors',
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60'
                      )}
                    >
                      <item.icon
                        size={15}
                        className={cn(
                          active ? 'text-sidebar-primary' : 'text-sidebar-foreground'
                        )}
                        strokeWidth={active ? 2 : 1.5}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 px-3 py-4 border-t border-sidebar-border space-y-1">
        <Link
          href="/queue/new"
          className="flex items-center gap-3 px-2 py-1.5 rounded-md text-sm text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60 transition-colors"
        >
          <Plus size={15} strokeWidth={1.5} />
          New Job
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-2 py-1.5 rounded-md text-sm text-sidebar-foreground/50 cursor-not-allowed pointer-events-none"
          aria-disabled
        >
          <Settings size={15} strokeWidth={1.5} />
          Settings
        </Link>

        <div className="mt-3 pt-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/60 transition-colors cursor-pointer">
            <div className="w-6 h-6 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0 ring-1 ring-sidebar-border">
              <span className="text-sidebar-foreground text-[10px] font-medium">W</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-sidebar-accent-foreground font-medium truncate leading-tight">
                Workspace
              </p>
              <p className="text-[10px] text-sidebar-foreground truncate leading-tight">
                Free plan
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
