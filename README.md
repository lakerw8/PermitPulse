# PermitPulse

Commercial building permits, turned into trade-filtered leads for
subcontractors. Permits come from municipal open data portals, are normalized
and cached, and are browsable for free; the general contractor's contact
details are the paid tier.

## What is actually true today

Numbers measured 2026-08-21. They are here because it is easy to describe this
product as something it is not yet.

| | |
|---|---:|
| Permits cached | 11,754 |
| Sources configured | 200 |
| Sources returning data at last refresh | 145 |
| Cities listed in the picker | 328 |
| Cities with a source behind them | 198 |
| Cities listed but not covered | 130 |
| Permits naming a contractor | 52% |
| Permits carrying a phone number | 5.5% |
| Markets passing the lead-quality gate | 2 of 145 |
| Permits carrying an email address | 0.2% |

The gap between 328 listed cities and 198 covered ones is now visible in the
product rather than hidden: uncovered cities are disabled in the picker and a
request that includes one says so, instead of returning an empty list that
looks like a quiet market. Customer-facing copy quotes measured numbers, never
the listed count.

Contact coverage is the product's central risk. Most city portals publish a
contractor *name* and no way to reach them. Any claim that the product delivers
a phone number for every permit is false, and the UI is built to say so per
permit rather than let a customer find out after paying.

## Setup

Requires Node 20+, pnpm, a Supabase project, and a Stripe account.

```bash
pnpm install
```

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
STRIPE_SECRET_KEY=sk_...
STRIPE_PAID_PRICE_ID=price_...          # the one price that grants access
STRIPE_WEBHOOK_SECRET=whsec_...         # required; the webhook 500s without it
CRON_SECRET=<random string>             # required in production
```

Then run the SQL in `supabase/`, in order (all five are already applied to the
production project as of 2026-08-21):

1. `setup.sql` — permits and refresh_log
2. `profiles-and-leads.sql` — profiles, saved leads, RLS
3. `migrations/0001_phase0_entitlements.sql` — entitlement enforcement
4. `migrations/0002_source_health.sql` — per-source health
5. `migrations/0003_permit_lifecycle.sql` — permit lifecycle and events

```bash
pnpm dev
```

## Architecture

```text
municipal open data portals
        │  200 adapters in src/lib/permit-adapters.ts
        ▼
/api/permits/refresh          weekday cron, see vercel.json
        │
        ▼
Supabase: permits ────────────────► refresh_log
        │                                │
        │  service role only             │ measured coverage + freshness
        ▼                                ▼
/api/permits            /api/leads    /api/coverage
/api/permits/[id]       /api/leads/export
        │
        │  every read passes through getViewer() → applyEntitlement()
        ▼
browser
```

The important structural rule: **the Next.js API is the entitlement boundary.**
Contact columns are revoked from the `anon` and `authenticated` Postgres roles,
so an unentitled caller cannot reach them through PostgREST either. No route
serializes a permit without going through `mapRowToPermit`, which applies
redaction; see `src/lib/permit-columns.ts`.

### Key modules

| Path | Role |
|---|---|
| `src/lib/permit-adapters.ts` | One adapter per municipal source |
| `src/lib/permit-columns.ts` | Which columns each viewer may receive |
| `src/lib/entitlements.ts` | Who may see contacts (pure, mirrored in SQL) |
| `src/lib/entitlements-server.ts` | Resolves the viewer from request cookies |
| `src/lib/coverage-registry.ts` | Which source serves which selectable city |
| `src/lib/source-health.ts` | Outcome vocabulary for a source run |
| `src/lib/coverage-status.ts` | Measured coverage and freshness |
| `src/lib/contact-confidence.ts` | What the confidence label means |
| `src/lib/lead-quality.ts` | Shared-contact suppression and market gates |
| `src/lib/lifecycle.ts` | Permit stages, signals, and status normalization |
| `src/lib/saved-leads-server.ts` | Saved leads joined with permits |
| `src/lib/csv.ts` | Export serialization |

## Entitlements

Access is granted only by Stripe status `trialing` or `active`. `past_due` is
excluded on purpose: Stripe holds that status for the whole dunning window,
which would otherwise hand out weeks of free access after a card fails.

The rule exists twice — `isEntitled` in TypeScript and
`public.profile_is_entitled` in SQL — because the API uses it to redact and the
database uses it to enforce the free saved-lead limit. **Change both together.**

Users cannot write their own billing state: `authenticated` holds UPDATE on
`profiles` for `metro` and `primary_trade` only.

## Refresh

`vercel.json` schedules `/api/permits/refresh` at 10:00 UTC on weekdays. It
fetches every configured adapter in batches of five, upserts by permit id, and
writes one `refresh_log` row per metro.

Manual run:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/permits/refresh
```

Scope it to specific metros with `?metros=chicago,austin`.

## Source health

Every refresh writes one `source_health` row per adapter: outcome, HTTP status
or error class, duration, raw/accepted/rejected counts, rejection reasons,
contact completeness, query window, and a consecutive-failure count.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/admin/source-health
curl -H "Authorization: Bearer $CRON_SECRET" "https://<host>/api/admin/source-health?failing=1"
```

Five outcomes are distinguished — `success`, `success_with_zero_records`,
`upstream_error`, `parse_error`, `normalization_error`, `database_error` — so a
broken source is no longer indistinguishable from a quiet market. Sources get a
15s timeout and up to 3 attempts with backoff on retryable statuses.

`GET /api/coverage` is the public, count-only view used by customer copy.

**Alerting is not wired up.** `summary.persistentlyFailing` (sources failing
three or more runs in a row) is the field to alert on.

## Tests

```bash
pnpm test          # vitest
pnpm typecheck
pnpm lint
```

Coverage is focused on the places where a bug costs money or misleads a
customer: entitlement resolution across every Stripe status, contact redaction,
the saved-lead join, CSV escaping, and the confidence copy. There are no
adapter fixture tests yet, and normal CI does not touch live municipal APIs.

## Deployment

See `docs/phase-0-deployment.md` for migration ordering, the Stripe webhook
events to subscribe, rollback, and what shipped in each slice.

## Known gaps

Tracked in `docs/handoffs/2026-08-20-claude-code-implementation-handoff.md`.
The open ones:

- **County-level duplicates.** `montgomery-county` and `prince-georges` are
  county-wide sources overlapping city adapters already in the picker. They are
  refreshed and health-checked but not selectable, because merging them would
  return the same building twice. Revisit with project clustering.
- **Rejection reasons are one bucket.** Adapters do not report *why* they drop
  a record, so `source_health.rejection_reasons` only counts
  `adapter_returned_null`.
- **Reachability is concentrated, not thin.** Two markets (Austin, Miami) pass
  the lead-quality gate; most are at zero reachable contacts. See
  `docs/phase-1-lead-quality.md`.
- **Twenty adapters hardcode `estimatedValue`**, thirteen of them to $100,000.
  Detected by the quality gate, not yet suppressed — customers filter and sort
  on those values.
- **Contact coverage.** 5.5% of permits carry a phone. Closing that likely
  means joining against state contractor license registries — unproven, and
  worth a spike before any schema work depends on it.
- **Permit detail is cache-only.** A permit that exists solely in a live
  adapter response cannot be deep-linked.
