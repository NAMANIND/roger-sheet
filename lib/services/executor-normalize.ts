import { ActionType } from '@prisma/client';
import type { Processor, ProcessorConfig, Queue, RepeatableJob } from '@/types/job';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID_RE = /^c[a-z0-9]{24,}$/i;
const ACTION_TYPES = new Set<string>(Object.values(ActionType));

export function isExecutorId(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  return UUID_RE.test(value) || CUID_RE.test(value);
}

export function parseExecutorDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const fromSerial = new Date((value - 25569) * 86400000);
    if (!Number.isNaN(fromSerial.getTime())) return fromSerial;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function parseConfig(value: unknown): ProcessorConfig {
  if (value && typeof value === 'object') return value as ProcessorConfig;
  if (typeof value === 'string' && value.trim().startsWith('{')) {
    try {
      return JSON.parse(value) as ProcessorConfig;
    } catch {
      return { script: '' };
    }
  }
  return { script: '' };
}

function inferActionType(config: ProcessorConfig): ActionType {
  const record = config as unknown as Record<string, unknown>;
  if ('script' in record) return ActionType.script;
  if ('url' in record) {
    const method = String(record.method ?? '').toUpperCase();
    if (method === 'PING' || record.ping === true) return ActionType.http_ping;
    return ActionType.http;
  }
  return ActionType.script;
}

/** Old deployed Apps Script can read id-first sheet rows with the legacy column map. */
export function normalizeExecutorProcessor(
  raw: Processor & { id?: string }
): (Omit<Processor, 'id'> & { id?: string }) | null {
  let id = raw.id;
  let name = raw.name;
  let type = raw.type;
  let config = parseConfig(raw.config);
  let description = raw.description ?? '';
  let createdAt = raw.createdAt;

  if (!id && isExecutorId(raw.name) && !ACTION_TYPES.has(String(raw.type))) {
    id = raw.name;
    name = String(raw.type);
    if (typeof raw.description === 'string' && raw.description.trim().startsWith('{')) {
      config = parseConfig(raw.description);
      description = '';
    }
    type = inferActionType(config);
    createdAt = new Date().toISOString();
  }

  if (!name?.trim()) return null;
  if (!ACTION_TYPES.has(String(type))) {
    type = inferActionType(config);
  }

  return {
    id: id && isExecutorId(id) ? id : undefined,
    name,
    type: type as Processor['type'],
    config,
    description,
    createdAt:
      typeof createdAt === 'string' && !Number.isNaN(Date.parse(createdAt))
        ? createdAt
        : parseExecutorDate(createdAt).toISOString(),
  };
}

export function normalizeExecutorQueue(
  raw: Queue & { id?: string }
): (Queue & { id?: string }) | null {
  let id = raw.id;
  let name = raw.name;
  let isPaused = raw.isPaused;
  let createdAt = raw.createdAt;

  if (!id && isExecutorId(raw.name) && typeof raw.isPaused === 'string') {
    id = raw.name;
    name = String(raw.isPaused);
    isPaused = Boolean(raw.createdAt);
    createdAt = new Date().toISOString();
  }

  if (!name?.trim()) return null;

  return {
    id: id && isExecutorId(id) ? id : undefined,
    name,
    isPaused: Boolean(isPaused),
    createdAt: parseExecutorDate(createdAt).toISOString(),
  };
}

export function normalizeExecutorSchedule(
  raw: RepeatableJob & { id?: string; pipelineId?: string; actionId?: string }
): RepeatableJob & { id: string } {
  const id = raw.id ?? raw.key;
  if (!id) {
    throw new Error('Schedule is missing an id from the executor');
  }
  return {
    ...raw,
    id,
    key: id,
  };
}
