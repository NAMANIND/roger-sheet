export function parseJobData(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return {};
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[object Object]') return {};
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      if (typeof parsed === 'string') {
        try {
          const twice: unknown = JSON.parse(parsed);
          if (typeof twice === 'object' && twice !== null && !Array.isArray(twice)) {
            return twice as Record<string, unknown>;
          }
        } catch {
          /* keep single parse */
        }
        return { _value: parsed };
      }
      return { _value: parsed };
    } catch {
      return { _raw: trimmed };
    }
  }
  return { _value: value };
}

export function formatDisplayJson(value: unknown, indent = 2): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '—';
    try {
      return JSON.stringify(JSON.parse(trimmed), null, indent);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, indent);
  } catch {
    return String(value);
  }
}

export interface ExecutionSplit {
  logs: string[];
  outputs?: unknown[];
  result: unknown;
  statusCode?: number;
}

export function splitExecutionOutput(raw: unknown): ExecutionSplit {
  let data: unknown = raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      data = JSON.parse(raw);
    } catch {
      return { logs: [], result: raw };
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { logs: [], result: data };
  }

  const obj = data as Record<string, unknown>;
  const logs = Array.isArray(obj.logs) ? obj.logs.map(String) : [];
  const outputs = Array.isArray(obj.outputs) ? obj.outputs : undefined;

  if ('result' in obj) {
    return { logs, outputs, result: obj.result };
  }

  if ('statusCode' in obj) {
    let result: unknown = obj.body;
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch {
        /* keep as text */
      }
    }
    return {
      logs,
      outputs,
      result,
      statusCode: Number(obj.statusCode),
    };
  }

  return { logs, outputs, result: data };
}
