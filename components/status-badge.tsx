import { Badge } from '@/components/ui/badge';
import { JobState } from '@/types/job';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  state: JobState;
  className?: string;
}

const stateConfig: Record<
  JobState,
  { label: string; className: string }
> = {
  waiting: {
    label: 'Waiting',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  active: {
    label: 'Active',
    className: 'bg-primary/15 text-primary border-primary/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  delayed: {
    label: 'Delayed',
    className: 'bg-sky-100 text-sky-800 border-sky-200',
  },
};

export function StatusBadge({ state, className }: StatusBadgeProps) {
  const config = stateConfig[state];

  return (
    <Badge
      variant="outline"
      className={cn('font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
