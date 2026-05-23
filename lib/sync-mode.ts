/**
 * async (default): UI writes Postgres + outbox; your infra calls /api/internal/sync.
 * inline: Phase A dual-write (waits on Apps Script in the same request).
 */
export function isAsyncSync(): boolean {
  return process.env.SYNC_MODE !== 'inline';
}
