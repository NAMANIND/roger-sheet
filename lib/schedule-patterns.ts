/** Minimum interval for recurring schedules (platform-wide). */
export const MIN_REPEATABLE_INTERVAL_MINUTES = 5;

export const IMMEDIATE_EXECUTION_LABEL = 'Immediate (runs in 1–2 minutes)';

export const REPEATABLE_PATTERN_OPTIONS = [
  { value: 'every-5-minutes', label: 'Every 5 minutes' },
  { value: 'every-10-minutes', label: 'Every 10 minutes' },
  { value: 'every-15-minutes', label: 'Every 15 minutes' },
  { value: 'every-30-minutes', label: 'Every 30 minutes' },
  { value: 'every-1-hours', label: 'Every hour' },
  { value: 'every-2-hours', label: 'Every 2 hours' },
  { value: 'every-6-hours', label: 'Every 6 hours' },
  { value: 'every-12-hours', label: 'Every 12 hours' },
  { value: 'daily-09:00', label: 'Daily at 09:00 UTC' },
  { value: 'daily-18:00', label: 'Daily at 18:00 UTC' },
] as const;

export function validateRepeatablePattern(pattern: string): string | null {
  const trimmed = pattern.trim();
  if (!trimmed) return 'Schedule pattern is required';

  const minuteMatch = /^every-(\d+)-minutes$/.exec(trimmed);
  if (minuteMatch) {
    const minutes = parseInt(minuteMatch[1], 10);
    if (Number.isNaN(minutes) || minutes < MIN_REPEATABLE_INTERVAL_MINUTES) {
      return `Minimum recurring interval is ${MIN_REPEATABLE_INTERVAL_MINUTES} minutes`;
    }
    return null;
  }

  if (/^every-\d+-hours$/.test(trimmed)) return null;
  if (/^daily-\d{2}:\d{2}$/.test(trimmed)) return null;

  return 'Use a supported pattern (e.g. every-5-minutes, every-1-hours, daily-09:00)';
}

export function patternLabel(pattern: string): string {
  const found = REPEATABLE_PATTERN_OPTIONS.find((o) => o.value === pattern);
  return found?.label ?? pattern;
}
