import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function extractTemplateVars(text: string): string[] {
  const matches = text.match(/\{(\w+)\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

export function buildHttpProcessorTestData(
  config: { url?: string; headers?: Record<string, string>; body?: unknown }
): Record<string, string> {
  const chunks = [
    config.url || '',
    JSON.stringify(config.headers || {}),
    typeof config.body === 'string' ? config.body : JSON.stringify(config.body || {}),
  ];
  const vars = new Set<string>();
  chunks.forEach((chunk) => extractTemplateVars(chunk).forEach((v) => vars.add(v)));
  const testData: Record<string, string> = {};
  vars.forEach((v) => {
    testData[v] = `sample-${v}`;
  });
  return testData;
}

export function formatDate(date: string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function getRelativeTime(date: string | null): string {
  if (!date) return 'N/A';
  
  const now = new Date();
  const then = new Date(date);
  const diffMs = then.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);
  const diffSec = Math.floor(absDiffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (isPast) {
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${diffDay}d ago`;
  } else {
    if (diffSec < 60) return 'in a moment';
    if (diffMin < 60) return `in ${diffMin}m`;
    if (diffHour < 24) return `in ${diffHour}h`;
    return `in ${diffDay}d`;
  }
}
