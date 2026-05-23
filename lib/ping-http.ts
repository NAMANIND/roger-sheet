import type { HttpMethod, HttpProcessorConfig } from '@/types/job';

function templateBrace(str: string, data: Record<string, unknown>): string {
  return str.replace(/\{(\w+)\}/g, (_, key: string) => {
    const val = data[key];
    if (val === undefined || val === null) return '';
    return typeof val === 'object' ? JSON.stringify(val) : String(val);
  });
}

function templateValue(value: unknown, data: Record<string, unknown>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return templateBrace(value, data);
  if (Array.isArray(value)) return value.map((item) => templateValue(item, data));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = templateValue(v, data);
    }
    return out;
  }
  return value;
}

/** Fire webhook from the platform — no await, no status recorded. */
export function firePingHttp(
  config: HttpProcessorConfig,
  data: Record<string, unknown>
): void {
  const url = templateBrace(String(config.url || ''), data);
  if (!url) return;

  const method = (config.method || 'GET') as HttpMethod;
  const headers: Record<string, string> = config.headers
    ? (templateValue(config.headers, data) as Record<string, string>)
    : {};

  const init: RequestInit = { method, headers };

  if (config.body != null && method !== 'GET') {
    const body = templateValue(config.body, data);
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (!headers['Content-Type']) {
      init.headers = { ...headers, 'Content-Type': 'application/json' };
    }
  }

  void fetch(url, init).catch(() => {});
}
