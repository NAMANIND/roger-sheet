'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QueueStats } from '@/types/job';

interface QueueStatsCardsProps {
  stats: QueueStats[];
  isLoading?: boolean;
}

export function QueueStatsCards({ stats, isLoading }: QueueStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalStats = stats.reduce(
    (acc, queue) => ({
      total: acc.total + queue.total,
      waiting: acc.waiting + queue.waiting,
      active: acc.active + queue.active,
      completed: acc.completed + queue.completed,
      failed: acc.failed + queue.failed,
      delayed: acc.delayed + queue.delayed,
    }),
    { total: 0, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
  );

  const cards = [
    {
      title: 'Total Jobs',
      value: totalStats.total,
      description: 'Queue + history',
      color: 'text-foreground',
    },
    {
      title: 'Completed',
      value: totalStats.completed,
      description: 'Finished successfully',
      color: 'text-emerald-600',
    },
    {
      title: 'Waiting',
      value: totalStats.waiting + totalStats.delayed,
      description: 'Ready or delayed in queue',
      color: 'text-amber-600',
    },
    {
      title: 'Failed',
      value: totalStats.failed,
      description: 'Need attention',
      color: 'text-destructive',
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-semibold tabular-nums ${card.color}`}>
              {card.value.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
