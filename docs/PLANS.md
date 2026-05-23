# Dispatch — Plans & pricing (draft)

Recommendations for what to offer and what to charge. Aligns with `Plan` in Prisma (`maxPipelines`, `maxActions`, `maxActiveJobs`, `maxSchedules`, `maxMembers`, `retentionDays`).

**Status:** Planning — limits in `prisma/seed.ts` are a starting point; tune before launch.

Related: [PHASE_C.md](./PHASE_C.md) (enforcement + Stripe).

---

## Scheduling rules (platform)

| Type | Behavior |
|------|----------|
| **Immediate** | Label: *Immediate (runs in 1–2 minutes)* — next sync + queue pickup |
| **Repeatable** | **Minimum every 5 minutes** — enforced in UI, API, and Apps Script |
| **Once** | Pick date/time — runs when delay elapses |

---

## Final plan summary (v1 launch)


**Dispatch** = job queue + scheduled tasks + reusable actions, with a fast dashboard (Postgres) and **hosted execution** on **one platform Apps Script** that every customer uses (multi-tenant).

From the customer’s perspective this is like **Trigger.dev**: they don’t deploy a worker. You run the runtime; they get pipelines, actions, schedules, and history in the UI.

You charge for **platform + runs** (control plane, sync, storage, fair share of shared Google Apps Script capacity).

---

## What to meter (and what not to)

| Limit | Meaning | Why charge on it |
|--------|---------|------------------|
| **Pipelines** | Named queues (pause, stats) | Complexity / isolation |
| **Actions** | HTTP + script handlers | Core value, storage |
| **Active jobs** | Rows in Queue (`waiting`, `active`, `delayed`) — **not** History | Drives sync + worker load on Sheets |
| **Schedules** | Cron-style repeatables | Power-user feature |
| **Members** | Users per organization | Team / SaaS standard |
| **History retention** | How long completed/failed stay in DB | Storage + support cost |

**Hosted execution (your model):**

- One **shared** Apps Script deployment + sheet backend — all orgs enqueue into the same executor (scoped by `organizationId` in data).
- **Your** Google quotas, trigger frequency, and Script runtime are the real capacity ceiling — price and limits must reflect that.

**Meter on v1 (keep simple):**

- Per-org caps: pipelines, actions, active jobs, schedules, members, retention (already in schema).

**Meter on v2 (Trigger-style, recommended once you have usage data):**

- **Jobs completed / month** per org (included bundle + overage)
- **Concurrent active jobs** (platform-wide cap ≈ “concurrent runs”)
- Optional: **included monthly usage** on paid tiers (e.g. Pro includes N completions)

**Do not meter yet:**

- Test runs (daily cap per org if abused)

---

## Two execution modes: **Ping** vs **Full**

Split what you run on the shared Apps Script. This is how you offer **high volume + frequent** work without blowing the **6 min/trigger** and **daily runtime** caps.

### Ping (light) — “call endpoint, mark done”

**What it does**

- HTTP action only: `POST`/`GET` (or `PUT`/`PATCH`) to customer URL with templated payload.
- **Does not** store response body, script logs, or outputs in History.
- Marks job **completed** if HTTP succeeds (e.g. 2xx), **failed** otherwise (status + short error only).
- Optional: store `{ statusCode }` only — no large `returnvalue` JSON.

**What it skips (on purpose)**

- No Apps Script `eval` / script actions.
- No `log()` collection, no result panel, no “Outputs” block in UI.
- Minimal graveyard row → less Sheet + Postgres write + faster pull sync.

**Why you can offer more**

| | Ping | Full (today) |
|--|------|----------------|
| Typical Script time | **~1–5 s** | **10 s – 2+ min** |
| Jobs per 6 min trigger run | **Many** (if batched) | **Few** |
| Storage per completion | Tiny | Large (body + logs) |
| Good for | Webhooks, “notify”, fire-and-forget | Scripts, debugging, HTTP with response |

**Product names (pick one for marketing)**

- **Ping** / **Signal** / **Tap** — light runs  
- **Run** / **Full** — script + rich HTTP  

### Full (heavy) — logs + results (current behavior)

- **Script** actions and/or HTTP where you **keep** response body.
- `returnvalue` with `{ result, logs, outputs }` or full HTTP body.
- History UI shows Logs + Result (what you built in Phase B UI).
- **Fewer** per plan, **less frequent** schedules encouraged.

### Suggested plan limits (meter separately)

Count **completions per month** per org (reset monthly), not only “active jobs”.

| | Free | Pro | Enterprise |
|--|------|-----|------------|
| **Ping** completions / month | **2,000** | **50,000** | Custom |
| **Full** completions / month | **50** | **2,000** | Custom |
| Max **Full** schedules (cron) | **2** | **20** | Unlimited |
| Ping schedules | Share schedule cap (10 / 100) | | |
| Full history retention | 7 days | 90 days | 1 year |

**Rules of thumb**

- Ping can run **every minute** on a schedule if the URL is fast.
- Full script schedules: default **≥ 5–15 min** interval on Free (document in UI).
- **1 Full run ≈ 20–40 Ping runs** in platform cost — optional internal weighting for capacity planning.

### Action types (implementation later)

| Type | Mode | Notes |
|------|------|--------|
| `http_ping` | Ping | New; required for light tier |
| `http` | Full | Keep; captures body |
| `script` | Full only | Never Ping — always logs/result |

Or: keep types as today and add per-job flag `executionMode: 'ping' | 'full'` (only `ping` allowed for `http`).

### Executor behavior (sketch)

```text
executeJob(job):
  if action.mode === 'ping':
    UrlFetch(url) with short timeout
    completed if 2xx else failed
    moveToGraveyard({ returnvalue: null, failedReason: status only })
  else:
    existing executeProcessor + full returnvalue
```

**Even better for Ping:** don’t run inside heavy `processQueue` loop — platform fires **one HTTP POST per job** to Apps Script `runPingJob` (fire-and-forget from Next). Ping then barely uses trigger runtime.

### UI / UX

- When creating action: **“Ping (fast, no logs)”** vs **“Full run (script or detailed HTTP)”**.
- Job detail for Ping: show **status + status code + duration**, not empty Result/Logs cards.
- Usage meter: `Ping 1,240 / 2,000` · `Full 12 / 50`.

### Schema (Phase C+)

Add to `Plan` (or `Plan.metadata` until migration):

```ts
maxPingCompletionsPerMonth: number | null
maxFullCompletionsPerMonth: number | null
maxFullSchedules: number | null  // optional stricter cron for Full only
```

Track per org in `metadata` or `UsageMonthly` table: `pingCount`, `fullCount`.

---

## Recommended tiers

### Free — **$0 / month**

**Audience:** Solo builders, eval, side projects.

| Limit | Recommended | Notes |
|--------|-------------|--------|
| Pipelines | **2** | Enough: prod + test |
| Actions | **10** | Scripts + HTTP; they advertise “unlimited tasks” |
| Active jobs | **20** | ~Trigger Free concurrent runs (20) |
| Schedules | **10** | Align with Trigger Free; see competitor section |
| Members | **3** | Small team; Trigger Free allows 5 |
| History retention | **7 days** | Matches seed |

**Include:**

- Full UI (queue, history, actions, pipelines, schedules)
- Hosted execution on **Dispatch’s** Apps Script (no Script deploy for users)
- Async sync (`push` / `pull`) — platform sync worker (your infra)
- Community / docs support only

**Exclude (upgrade hooks):**

- Multiple teammates
- Long audit trail
- Priority support
- Custom retention

**Why these counts:** Free should feel **complete** but hit a wall when they run something real (team, more cron, bigger backlog).

---

### Pro — **$29 / month** (or **$290 / year**, ~2 months free)

**Audience:** Small teams, agencies, one production “system” on Sheets.

| Limit | Recommended | Notes |
|--------|-------------|--------|
| Pipelines | **10** | Several products/envs |
| Actions | **50** | Real library of handlers |
| Schedules | **100** | Match Trigger Hobby tier |
| Members | **5** | Match Trigger Free/Hobby team size |
| Active jobs | **100** | Between Trigger Hobby (50) and Pro (200) — or use **200** for parity |
| History retention | **90 days** | Debugging + compliance-light |

**Include everything in Free, plus:**

- Email support (48h response — set expectation in docs)
- Optional: email on outbox sync failures (when built)
- Export history (CSV) — good Pro differentiator when you build it

**Price rationale:**

- Below “serious workflow” tools ($49–99) but above toy tier ($9)
- ~$1/day for teams already paying for Google Workspace
- If cost-conscious market (India): consider **₹999–1,499/mo** PPP or **$19/mo** regional — same limits

---

### Enterprise — **from $199 / month** (custom)

**Audience:** Larger ops, compliance, many pipelines, SLA.

| Limit | Recommended |
|--------|-------------|
| Pipelines | **Unlimited** (`null` in DB) |
| Actions | **Unlimited** |
| Active jobs | **Unlimited** (or soft cap 50k with talk) |
| Schedules | **Unlimited** |
| Members | **Unlimited** (or 50+ included) |
| History retention | **365 days** (or custom) |

**Include Pro, plus:**

- Dedicated support / onboarding call
- Custom retention & export
- SSO (when built — Phase C+)
- Multiple execution backends per org (if you build it)
- SLA on sync latency (e.g. pull within 2 min) — only if you run hosted sync for them
- Invoice / annual contract

**Sales motion:** “Contact us” — don’t self-serve unlimited on Stripe without a conversation.

---

## Comparison table (for marketing page)

| | Free | Pro | Enterprise |
|--|------|-----|------------|
| **Price** | $0 | $29/mo | Custom |
| Pipelines | 2 | 10 | Unlimited |
| Actions | 10 | 50 | Unlimited |
| Schedules | 10 | 100 | Unlimited |
| **Ping** runs / month | 2,000 | 50,000 | Custom |
| **Full** runs / month | 50 | 2,000 | Custom |
| Team members | 3 | 5 | Unlimited |
| Active jobs (queued) | 20 | 100 | Unlimited |
| History (Full runs) | 7 days | 90 days | 1 year+ |
| Ping history | Status only, 7 days | 7 days | Custom |
| Support | Docs | Email | Dedicated |
| Billing | — | Stripe | Invoice |

---

## Suggested Stripe mapping (when you ship Phase C)

| `Plan.slug` | Stripe Price (example) | Billing |
|-------------|------------------------|---------|
| `free` | No Stripe product | — |
| `pro` | `price_xxx` monthly + `price_yyy` annual | Self-serve checkout |
| `enterprise` | Custom Price or manual subscription | Sales |

Store Stripe Price IDs in `Plan.metadata`:

```json
{ "stripePriceIdMonthly": "price_...", "stripePriceIdAnnual": "price_..." }
```

---

## Seed alignment (`prisma/seed.ts`)

Current seed is **more generous** than this doc (e.g. Free = 100 active jobs). Before launch, either:

1. Update seed to match this doc, or  
2. Keep seed loose for dev and enforce stricter limits only in production seed.

**Recommended production seed values:**

```ts
free:       { maxPipelines: 2,  maxActions: 10, maxActiveJobs: 20, maxSchedules: 10, maxMembers: 3,  retentionDays: 7 }
pro:        { maxPipelines: 10, maxActions: 50, maxActiveJobs: 100, maxSchedules: 100, maxMembers: 5, retentionDays: 90 }
enterprise: { maxPipelines: null, maxActions: null, maxActiveJobs: null, maxSchedules: null, maxMembers: null, retentionDays: 365 }
```

---

## Cost sanity check (your margin)

You **host execution** — costs scale with **total** platform usage, not per-customer BYO Script.

| Item | Order of magnitude |
|------|---------------------|
| Supabase / Postgres | $0–5 → grows with tenants + history |
| Vercel / hosting | $0–20 |
| **Shared Apps Script + Sheets** | **Main risk** — daily quotas, 6 min/run, UrlFetch, trigger every 1 min |
| Sync worker (your cron → `/api/internal/sync`) | Your compute; must run for all tenants |

**Implications for pricing:**

- Free tier must be **small enough** that many free users don’t exhaust one Script project.
- Pro/Enterprise pay for **share of platform capacity** — consider **included completions/month** like Trigger’s “$10 usage included.”
- Watch **global** concurrent active jobs across all orgs, not only per-org limits.

---

## Pricing experiments (after launch)

| Hypothesis | Test |
|------------|------|
| $29 too high for sheet users | A/B $19 vs $29 on Pro |
| Active jobs too abstract | Show “queue depth” + add monthly “jobs completed” cap on Free (e.g. 200/mo) |
| Teams need Pro | Gate 2+ members to Pro only (Free = 1 member strict) |

---

## Opinionated defaults (if you want one answer)

| Question | Recommendation |
|----------|----------------|
| Free tier? | **Yes** — required for devtool adoption |
| Pro price? | **$29/mo** US; **$19** if targeting price-sensitive markets |
| Annual discount? | **~17%** ($290/year) |
| Enterprise floor? | **$199/mo** or **$2k/year** minimum contract |
| Main upgrade trigger? | **Members > 1** and **active jobs > 25** |

---

## What to build in the product (not just numbers)

For pricing to feel fair, expose in UI (Phase C):

- Usage meter: pipelines 2/2, active jobs 18/25
- Upgrade CTA when limit hit
- Plan name on billing settings
- Retention notice: “Jobs older than 7 days are removed from History”

---

## Competitor comparison: Trigger.dev

Trigger.dev is the closest **category** competitor (background jobs, schedules, dashboard, teams). The product is **not** interchangeable: they **run your code** in their cloud; Dispatch **orchestrates** work on **your** Google Sheets / Apps Script.

### What each product actually is

| | **Trigger.dev** | **Dispatch (you)** |
|--|-----------------|---------------------|
| Execution | Their cloud runs your tasks (Node/Python) | **Your** single Apps Script + Sheets (all customers) |
| User deploys worker? | No | **No** — same as Trigger from UX |
| Compute billing | $5 / $10 / $50 **included usage**, then overage | Should add **included job runs** over time; today = per-org caps only |
| DX target | App backend developers | Automations, ops, sheet-adjacent workflows |
| Environments | Dev, Preview, Prod, branches | Pipelines (pause queues) — **no** preview deploys yet |
| Observability | Logs, queries, Realtime, alerts | Job history, payload, logs/result from script runs |
| Tasks definition | Code SDK | **Actions** (HTTP + script templates + params) |

**Positioning line:** *“Hosted job queue like Trigger.dev, powered by our Apps Script runtime”* — comparable **buyer promise**, different engine under the hood.

---

### Feature mapping (apples → oranges)

| Trigger.dev | Rough Dispatch equivalent | Notes |
|-------------|---------------------------|--------|
| Concurrent runs | **Active jobs** in queue | They cap parallel execution; you cap queued work visible to worker |
| Unlimited tasks | **Actions** (you cap count) | They don’t cap task definitions; you cap reusable handlers |
| Schedules | **Schedules** (cron) | They give 10–1000+; your draft is 2–20 — **gap** |
| Log retention | **History retention** | Similar idea (1 / 7 / 30 days) |
| Team members | **Members** | They give **5 on Free**; you planned **1 on Free** — **gap** |
| Dev / Prod environments | **Pipelines** (2–10) | Similar intent, different model |
| Preview branches | — | **You don’t offer** (roadmap or never) |
| Custom dashboards | Queue stats UI | Basic today; not customizable per customer |
| Realtime connections | — | **You don’t offer** |
| Alert destinations | — | **You don’t offer** (email/Slack on failure = future) |
| Community / Slack support | Docs / email / dedicated | Align by tier |
| Included usage ($) | — | **N/A** — your margin is control plane + sync |

---

### Tier-by-tier vs Trigger.dev (their public pricing)

| Dimension | Trigger **Free** | Trigger **Hobby** $10 | Trigger **Pro** $50 | Dispatch **Free** (draft) | Dispatch **Pro** (draft) $29 |
|-----------|------------------|----------------------|----------------------|---------------------------|------------------------------|
| Base price | $0 + $5 usage | $10 + $10 usage | $50 + $50 usage | $0 | $29 (no usage line) |
| Concurrent / active | **20** runs | **50** | **200+** (+$10/50) | **25** jobs | **500** jobs |
| Task definitions | Unlimited | Unlimited | Unlimited | **5** actions | **50** actions |
| Schedules | **10** | **100** | **1000+** | **2** | **20** |
| Team | **5** | **5** | **25+** (+$20/seat) | **1** | **5** |
| Log / history | **1 day** | **7 days** | **30 days** | **7 days** | **90 days** |
| Environments | Dev + Prod | + Preview | + more branches | 2 pipelines | 10 pipelines |
| Support | Community | Community | Slack | Community | Email |

**Where Dispatch looks weaker on paper**

- Free **schedules** (2 vs their 10) and **members** (1 vs 5)
- No **usage pool** messaging (they advertise “$5 free compute”)
- No realtime, alerts, preview branches, query UI

**Where Dispatch can win**

- **No worker deploy** for the user (same mental model as Trigger)
- **Actions** tuned for HTTP + light script (params, templates) vs full SDK project
- **Sheets-backed** transparency (power users can inspect queue/history in sheet if you expose it)
- **Longer history on Pro** (90d vs their 30d) if you keep that
- **Pro at $29** undercuts their **$50** if your shared Script capacity supports the margin

**Where Dispatch must be careful**

- **One Script** for everyone → noisy neighbor problem; enforce per-org limits + global caps
- Google quotas ≠ elastic cloud; burst traffic hits a wall faster than Trigger’s workers

---

### Revised recommendations (after Trigger comparison)

Don’t copy their numbers 1:1 — your costs and features differ. Adjust so Free doesn’t feel stingy vs Trigger **Free**, while Pro stays below their **$50**.

| Limit | Was (draft) | **Suggested now** | Why |
|--------|-------------|-------------------|-----|
| Free schedules | 2 | **10** | Match Trigger Free schedule cap |
| Free members | 1 | **3** | Under their 5, but allows tiny team |
| Free active jobs | 25 | **20** | Near their 20 concurrent runs |
| Free actions | 5 | **10** | “Unlimited tasks” is their pitch; offer more handlers |
| Pro price | $29 | **$19–29** | Hobby is $10 (different scope); Pro compete under $50 |
| Pro schedules | 20 | **100** | Match Trigger Hobby on schedules |
| Pro active jobs | 500 | **50–100** | Between Hobby 50 and Pro 200 — or **200** if you want “Pro” parity |

**Optional tier rename (marketing)**

| Dispatch | Analogous Trigger tier | Price thought |
|----------|------------------------|---------------|
| Free | Free | $0 |
| **Hobby** or **Starter** | Hobby | **$12/mo** — between $10 and $29 |
| Pro | Pro (lighter) | **$29/mo** — under $50 |
| Enterprise | Custom | $199+ |

You can keep two paid tiers (Pro + Enterprise) and skip a $12 middle tier until you need it.

---

### What to say on the pricing page (honest)

- **“Hosted jobs — nothing to deploy”** (like Trigger; unlike self-hosted BullMQ).
- **“We run the worker”** — one managed Apps Script backend, your org’s data isolated in the platform DB (and sheet rows scoped by tenant when you implement it).
- **Not for** teams that need arbitrary Node/Python long-running workers → Trigger/Inngest still fit better.
- **Upgrade for** more schedules, queue depth, team seats, history retention — and eventually **included monthly job runs**.

---

### Usage-based pricing (Trigger-style) — fits hosted model

Because **you** run the single executor, bundled usage is fair:

| Tier | Suggested included | Overage (example) |
|------|-------------------|-------------------|
| Free | **200 job completions / mo** | Hard stop or queue until next month |
| Pro ($29) | **5,000 completions / mo** | $10 per 5k |
| Enterprise | Custom | Contract |

Map to marketing like Trigger: *“$0 + 200 runs”* on Free, *“$29 + 5k runs”* on Pro (adjust after measuring Script cost per job).

Until metering ships, **per-org count limits** still protect the shared Script.

---

## Changelog

| Date | Change |
|------|--------|
| 2025-05 | Ping vs Full execution modes |
| 2025-05 | Trigger.dev competitive comparison |
| 2025-05 | Initial draft for Dispatch pre-launch |
