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
              <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalStats = stats.reduce(
    (acc, queue) => ({
      total: acc.total + queue.total,
      pending: acc.pending + queue.pending,
      processing: acc.processing + queue.processing,
      completed: acc.completed + queue.completed,
      failed: acc.failed + queue.failed,
      dead: acc.dead + queue.dead,
    }),
    { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, dead: 0 }
  );

  const cards = [
    {
      title: 'Total Jobs',
      value: totalStats.total,
      description: 'All jobs in the system',
      color: 'text-gray-900',
    },
    {
      title: 'Pending',
      value: totalStats.pending,
      description: 'Waiting to be processed',
      color: 'text-amber-600',
    },
    {
      title: 'Processing',
      value: totalStats.processing,
      description: 'Currently running',
      color: 'text-green-600',
    },
    {
      title: 'Failed',
      value: totalStats.failed + totalStats.dead,
      description: 'Need attention',
      color: 'text-red-600',
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-normal text-gray-500 uppercase tracking-wide">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-light ${card.color}`}>
              {card.value.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400 font-light mt-1">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
