import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type DataTableShellProps = {
  children: ReactNode;
  className?: string;
};

/** Consistent table container — card surface, no ad-hoc gray borders. */
export function DataTableShell({ children, className }: DataTableShellProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card overflow-hidden shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

type DataTableEmptyProps = {
  colSpan: number;
  title: string;
  description?: string;
};

export function DataTableEmpty({ colSpan, title, description }: DataTableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 text-center">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {description}
          </p>
        )}
      </td>
    </tr>
  );
}

export const dataTableHeadClass =
  'h-9 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 first:pl-4 last:pr-4';

export const dataTableCellClass = 'px-3 py-2.5 text-sm first:pl-4 last:pr-4';
