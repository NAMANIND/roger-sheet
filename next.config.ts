import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/jobs', destination: '/queue', permanent: true },
      { source: '/jobs/new', destination: '/queue/new', permanent: true },
      { source: '/jobs/:id', destination: '/queue/:id', permanent: true },
      { source: '/processors', destination: '/actions', permanent: true },
      { source: '/processors/new', destination: '/actions/new', permanent: true },
      { source: '/processors/:id/edit', destination: '/actions/:id/edit', permanent: true },
      { source: '/queues', destination: '/pipelines', permanent: true },
      { source: '/graveyard', destination: '/history', permanent: true },
      { source: '/cron', destination: '/schedules', permanent: true },
      { source: '/cron/new', destination: '/queue/new', permanent: true },
    ];
  },
};

export default nextConfig;
