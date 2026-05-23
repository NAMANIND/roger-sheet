# Phase A — Prisma control plane

## Architecture

- **Postgres (Prisma):** What the UI reads/writes — pipelines, actions, jobs, history, schedules, plans, organizations.
- **Apps Script (executor):** **One platform-owned** deployment — all customers run on your Script (hosted). Called from services / internal sync — not per-customer deploys.

The hidden system organization (`__system__`, `isSystem: true`) holds all data until multi-tenant auth ships ([PHASE_C.md](./PHASE_C.md)).

## Setup

1. Put `DATABASE_URL` (and `DIRECT_URL` for Supabase) in **`.env.local`** — Prisma CLI does not read `.env.local` by default; use `npm run db:*` scripts (they load it via `dotenv-cli`).
2. Set `APPS_SCRIPT_WEB_APP_URL` and `INTERNAL_API_SECRET`.
3. Run migrations and seed:

```bash
npm run db:migrate
npm run db:seed
```

4. Import existing sheet data (optional):

```bash
npm run db:sync
```

5. Redeploy Apps Script so `addJob` accepts client-provided `id`.

## Internal API

- `POST /api/internal/executor` — proxy to Apps Script (`{ action, data }`)
- `POST /api/internal/sync` — pull Sheets → Postgres

Header: `Authorization: Bearer <INTERNAL_API_SECRET>`

## Phase B

See [PHASE_B.md](./PHASE_B.md) — async outbox + unified `/api/internal/sync`.

## Phase C

See [PHASE_C.md](./PHASE_C.md) — auth, multi-tenant orgs, plan limits, billing, per-org sync keys (planning only).
