# Phase B — Async two-way sync

## Flow

```
UI write  →  Postgres (+ SyncOutbox row)  →  instant response

Your worker (every 30–60s):
  POST /api/internal/sync  { push: true, pings: true, pull: true }
    push  →  drain outbox  →  Apps Script (addJob, etc.)
    pings →  waiting Ping jobs →  platform fires webhooks (no await, no status)
    pull  →  Sheets state  →  Postgres (completions, etc.)

Minute trigger (Apps Script): schedules + **Full** jobs only. Ping jobs skip the heavy loop.

**Usage sheet:** the executor spreadsheet has a **Usage** tab — one row per UTC day with minute trigger runs, ping runs, full job counts, and API write calls. Query via `getUsageStats` or open the sheet directly.
```

## Environment

```env
SYNC_MODE=async          # default — omit or set explicitly
# SYNC_MODE=inline     # Phase A: wait on Apps Script in same request

INTERNAL_API_SECRET=...
APPS_SCRIPT_WEB_APP_URL=...
DATABASE_URL=...
DIRECT_URL=...           # Supabase migrations only
```

## Your infrastructure

```bash
curl -X POST https://your-app.com/api/internal/sync \
  -H "Authorization: Bearer $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"push": true, "pings": true, "pull": true}'
```

Or locally:

```bash
npm run db:sync
```

### Recommended schedule

- **Every 30–60 seconds** while you have pending jobs or active queues
- `push: true` — required for new UI writes to reach Sheets
- `pull: true` — required for completed/failed jobs to show in History

## Migrate

```bash
npm run db:migrate:deploy
```

### Supabase already has tables but migrate fails (P3005 / drift)

You likely used `db push` or created tables before migrations were recorded. **Baseline** (keeps data):

```bash
npm run db:baseline
npm run db:migrate:deploy
```

Fresh dev DB only (wipes data):

```bash
npx prisma migrate reset
```

## Outbox behavior

- Retries with exponential backoff (max 5 attempts)
- Dedupes: max 10 pending rows per `entityId` + `executorAction`
- Failed rows stay in DB with `status: failed` — inspect via Prisma Studio

## What stays synchronous

- **Test action** / **test draft** — still calls Apps Script directly (no outbox)

## Rollback to Phase A

Set `SYNC_MODE=inline` in `.env` — UI waits on Apps Script again, no outbox enqueue.

## Phase C

See [PHASE_C.md](./PHASE_C.md) — platform / SaaS (not started).
