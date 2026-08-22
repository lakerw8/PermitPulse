# Phase 0 deployment

> **Migration status: 0001, 0002 and 0003 were applied to the production
> project (`kfdqmphpsxoseyjlqfhv`) on 2026-08-21 and verified.** The database
> is ahead of the deployed application code, which is expected and safe — see
> "Current state" immediately below.

## Current state after applying the migrations

Verified against the live project with the anon key:

| Check | Result |
|---|---|
| `gc_phone` / `gc_email` / `gc_company_name` / `gc_contact_name` via anon key | **denied (401)** |
| Public and lifecycle columns via anon key | 200 |
| `source_health`, `permit_events`, `stripe_events`, `refresh_log` via anon key | **denied (401)** |
| Contact columns via service role (the API's own path) | 200 |
| `authenticated` UPDATE on `profiles` | `metro, primary_trade, updated_at` only |

Pre-flight at the time of the migration: 11,754 permits, 1 profile, 0 saved
leads, 0 self-granted paid profiles. Nothing had to be repaired first.

### What is fixed right now, before any deploy

- The anon key can no longer read GC contact columns from PostgREST.
- Nobody can grant themselves the paid plan by writing `profiles.plan`.
- The free saved-lead limit is enforced by a database trigger.

### What is NOT fixed until the application deploys

**`/api/permits` still returns full contact details to everyone.** The deployed
route reads with the service role, which by design bypasses the grants above,
and the deployed version has no entitlement check. The migration closed the
direct-database path; the API path closes when the new code ships.

Also still on old behaviour until deploy:

- The weekday refresh cron keeps running the old code, so `source_health` and
  the lifecycle columns stay empty and shared contacts (Peoria's permit-desk
  number) keep being written.
- The dashboard's "Start free trial" button writes to columns it may no longer
  update, so it silently does nothing. With one profile in the database this
  affects only the owner.

Server-side entitlements and Stripe lifecycle handling. Everything below is
backward compatible with the currently deployed code, so the migration can be
applied before the deploy.

## Order

**1. Apply the migration first.** *(Done on 2026-08-21.)*

Run `supabase/migrations/0001_phase0_entitlements.sql` in the Supabase SQL
editor, or with
`supabase db query --linked -f supabase/migrations/0001_phase0_entitlements.sql`.
It is safe to run while the old release is serving traffic:

- The old client never read the `permits` table directly, so revoking the
  contact columns from `anon`/`authenticated` breaks nothing it does.
- The old client *did* write `plan` and `trial_ends_at` from the browser
  (the Plan Simulator and the "Start free trial" button). After the migration
  those writes fail. That is the point — but it means the window between the
  migration and the deploy has a visibly broken simulator button. Keep it
  short, or apply the migration immediately before deploying.

Section 6 (the saved-lead CHECK constraints) is the only part that can fail on
existing data. If it errors, sections 1–5 have already committed; fix the
offending rows and re-run section 6 alone.

**2. Set the environment variables.**

`STRIPE_WEBHOOK_SECRET` is now required — the webhook returns 500 without it
rather than processing unverified payloads. `STRIPE_PAID_PRICE_ID` is now load
bearing: a subscription for any other price does not grant access.

**3. Deploy the application.**

**4. Add the `customer.subscription.created` event to the Stripe webhook
endpoint** if it is not already subscribed. The handler now needs
`checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, and `customer.subscription.deleted`.

**5. Reconcile existing paying customers.** Any profile written before this
change has no `subscription_status`. Those users keep access through the
legacy fallback (`plan <> 'free'` *and* a `stripe_customer_id` is present) and
are upgraded to a real status the first time they load the dashboard after
Checkout, or the next time Stripe sends an event for them. To force it
sooner, have each customer hit `POST /api/billing/reconcile` once, or replay a
`customer.subscription.updated` event from the Stripe dashboard.

## Rollback

Reverting the deploy is safe on its own; the migration does not need to be
undone, because the old code paths that the migration blocks are exactly the
ones being removed. If a rollback is needed *and* the old client must work
again:

```sql
grant select on public.permits to anon, authenticated;
grant update on public.profiles to authenticated;
```

This restores the previous (insecure) behaviour. Prefer fixing forward.

## What changed, and why

### Contact data is withheld, not hidden

`/api/permits` resolves the caller before reading anything and selects the
`gc_*` columns only for an entitled viewer. An unentitled response carries no
contact values at all — the paywall components have nothing to reveal because
nothing was sent.

Free and anonymous viewers still learn *what exists* (a named GC, a phone, an
email) through the generated `has_gc_*` columns, which hold booleans rather
than values. This replaced the previous UI, which blurred a real company name
and invented a fake phone number for every permit — including the 40% of
permits that name no contractor at all.

**Open product decision:** the company name is currently treated as paid,
matching what the pricing page sells. To make it free, add `gc_company_name`
to `PUBLIC_COLUMNS` in `src/app/api/permits/route.ts` and stop clearing it in
`redactContact`.

### Entitlement has one definition, in two places

`public.profile_is_entitled` (SQL) and `isEntitled` (TypeScript) implement the
same rule and must be changed together. Only Stripe's `trialing` and `active`
grant access. `past_due` does not: Stripe holds that status for the entire
dunning window, which previously meant weeks of free access after a card
failed.

### Billing is service-owned

`authenticated` can now UPDATE only `metro`, `primary_trade`, and
`updated_at` on `profiles`. The Plan Simulator that granted the paid tier from
the browser has been removed, and the dashboard's trial button now goes
through Stripe Checkout.

### The webhook is idempotent and retryable

Every event id is claimed in `stripe_events` before processing, so replays are
acknowledged without re-running the handler. A failed profile write releases
the claim and returns 500 so Stripe retries — previously such a failure was
swallowed and answered 200, silently dropping the customer's upgrade.

---

# 0E: saved leads, permit detail, and export

No migration and no new environment variables. Deploy after 0A/0B.

## What changed, and why

### Saved leads no longer depend on what you were browsing

The dashboard used to build its list by looking each saved lead up in
`PermitsContext` — the single page of permits the browse view happened to be
holding — and dropping any lead it could not find. A lead saved in Chicago
disappeared as soon as the user switched region, changed a filter, paginated,
or reloaded.

`GET /api/leads` now joins on the server against the whole table, so the result
depends only on who is asking. A lead whose cached permit is gone is still
returned, with `permit: null`, and rendered as "Permit record unavailable"
rather than silently dropped — the user keeps the status and notes they wrote.

### Direct permit links work

`GET /api/permits/[id]` fetches one permit with the same entitlement rule as
the list, and `/permits/[id]` calls it on mount instead of reading client
memory. A bookmarked or shared link now resolves in a fresh session.

**Known limit:** the lookup is cache-only. A permit that exists solely in a
live adapter response has no queryable home — its id prefix identifies the
adapter, not a key any source accepts — so it returns 404 with an honest
"not cached yet" message. Closing that gap is 0C/0D work: it needs every
advertised market to be backed by a source that actually populates the cache.

### CSV export covers every saved lead

`GET /api/leads/export` builds the file on the server from the full lead list.
The browser version could only export permits that were loaded, so an export
of 40 saved leads routinely produced 12 rows with no indication anything was
missing.

The serializer also quotes every field and doubles embedded quotes. The old
version interpolated raw values, so a description containing a comma shifted
every later column and one containing a newline split the row in two. Values
starting `=`, `+`, `-` or `@` are prefixed with an apostrophe so a spreadsheet
treats them as text rather than a formula.

Export is gated to paid plans, and contacts are redacted independently of that
gate — if the gate is ever relaxed the file still cannot carry contact details
to someone unentitled.

### Failed writes no longer look like successes

Every saved-lead mutation awaits the database and restores the previous list if
the write fails, with a dismissible error on the dashboard and the detail page.
Previously all four mutations were fire-and-forget: a rejected write left the
UI showing state that was never persisted, and the user found out on their next
reload.



---

# 0F: honest customer copy

No migration and no new environment variables. Deploy any time after 0A/0B.

## Claims removed or corrected

| Claim | Reality | Now says |
|---|---|---|
| "328 cities with live tracking" | 145 sources return data | Measured count from `refresh_log` |
| "Our enrichment engine finds the right decision-maker on every permit" | No enrichment exists; 48% name nobody | What the city published, per permit |
| "Full GC name, phone & email" | 5.5% carry a phone | "where the city publishes them" |
| "Weekly email digest" | Nothing sends email | Removed from pricing, plans, dashboard |
| "Full permit history" | 90-day window | "90 days of permit history" |
| "24hr data refresh" / "Daily" | Weekday cron | "Weekday source refresh" |
| "No credit card required" (trial) | Checkout collects a card | "Card required, cancel any time" |
| "Cancel from your dashboard" | Was false; the 0B portal made it true | Kept |

## Measured freshness

`GET /api/coverage` reports sources returning data, sources configured,
permits cached, and the last successful refresh, from `refresh_log` with a
five-minute in-process cache.

The permits page previously printed `new Date()` at fetch time as the update
timestamp, so a week-old cache read as seconds old. It now shows when the
*sources* were last read, and warns when that is more than three days ago
(three, not one, so a normal weekend is not reported as a stall).

**Caveat carried forward:** because `fetchAdapter` swallows non-2xx responses,
`refresh_log` currently records every source as a success. "Operational" is
therefore defined as *returned at least one permit*, which is the strongest
honest claim available until 0D lands. All 200 sources currently report
success; 145 returned data.

## Confidence labels

`src/lib/contact-confidence.ts` is now the single definition of what High,
Medium, and Low mean: **which field of the city record the name came from** —
not whether anyone confirmed it. High is a dedicated contractor field, Medium
a general applicant field (often the property owner), Low no name at all.

The label is shown with its explanation everywhere it appears, and a test
fails if the words "verified" or "confirmed" ever enter that copy.

## Coverage helpers

`coverage.ts` no longer exports a "cities covered" label — there was no honest
way to use one. It exports `CITY_LISTED_LABEL` for the picker's size, which is
a different claim. Coverage claims come from `coverage-status.ts`.

---

# 0C + 0D: coverage registry and source health

Shipped together because they depend on each other: the registry needs a health
signal to say which cities are actually working, and health needs the registry
to attribute a source to a market.

## Deploy order

**1. Apply `supabase/migrations/0002_source_health.sql`.** Additive: it creates
`source_health` and adds two columns to `refresh_log`. The previous release
keeps writing `refresh_log` as before.

**2. Confirm `CRON_SECRET` is set.** The refresh route now **fails closed** —
it returns 503 when the variable is missing, where it previously authorized
everyone. A deploy without it silently stops refreshing.

**3. Deploy.**

**4. Run one refresh manually** to populate `source_health`, then check
`GET /api/admin/source-health` (same bearer token). Until that first run, the
per-market freshness read falls back to the platform-wide figure.

## What changed

### Coverage is declared, not inferred

`src/lib/coverage-registry.ts` maps each selectable city to the sources that
serve it. A city is covered because an adapter is mapped to it — never because
it sits in a region whose other members are covered.

The measured position: **328 cities are selectable, 200 have an adapter, 130 do
not.** Those 130 previously returned an empty list indistinguishable from a
quiet market. They are now disabled in the picker with "No source yet", and a
request that includes them says so.

Two adapters — `montgomery-county` and `prince-georges` — are reachable by no
selection. They are county-wide sources overlapping city-level adapters already
in the picker (Rockville, Silver Spring, Bethesda and Gaithersburg are all
Montgomery County), so adding them as markets would return the same building
twice under two permit ids. They are listed in `EXCLUDED_ADAPTERS` with that
reason, still refreshed, still health-checked, and not sold. **Revisit when
project clustering (Phase 1C) can merge duplicates.**

`coverage-registry.test.ts` fails the build on drift: a city with no
resolution, an adapter reachable from nothing and not excluded, a region
referencing an unknown city, duplicate ids, or an adapter-key collision.

### Failures stop looking like empty markets

`runAdapter` replaces `fetchAdapter`'s `Permit[]` with a typed result carrying
the adapter key, HTTP status or error class, duration, raw/accepted/rejected
counts, rejection reasons, contact completeness, and the query window. Five
outcomes are distinguished:

| Outcome | Means |
|---|---|
| `success` | Records arrived and normalized |
| `success_with_zero_records` | The source answered and had nothing |
| `upstream_error` | Non-2xx, network failure, or timeout |
| `parse_error` | Body was not the shape we read |
| `normalization_error` | Records arrived and every one was dropped — usually a schema change |
| `database_error` | We read the source and failed to store it |

Requests get a 15s timeout and up to 3 attempts with exponential backoff, on
retryable statuses only (429, 408, 5xx). A 404 is not retried.

**Why this matters:** before this, `refresh_log` recorded 200 successes and
zero failures, because every failure returned `[]`. That number was never true.

### The API stops answering "0 permits" for everything

`/api/permits` resolves the selection through the registry and reports what it
found:

- Every selected city uncovered → `degraded.reason: "no_coverage"`
- Some uncovered → `partial_coverage`, with the city names
- All sources failed, no cache → **503** with `sources_unavailable`
- Some sources failed → `partial_coverage` noting the list may be incomplete
- Cache served past the staleness window → `serving_stale`

Staleness is three days, not one: the cron runs weekdays, so a Monday read is
legitimately looking at Friday's data.

### Operator view

`GET /api/admin/source-health` (bearer `CRON_SECRET`) returns every source with
its last attempt, last success, latency, counts, rejection reasons, contact
completeness, and consecutive failure count, plus a summary by outcome and a
count of sources failing 3+ runs in a row. `?failing=1` narrows to failures.

Alerting is not wired up — `persistentlyFailing` is the field to alert on.

## Known limits

- `source_health` starts empty; per-market freshness falls back to the
  platform-wide figure until the first refresh populates it.
- Rejections are counted under one bucket (`adapter_returned_null`) because the
  adapters do not yet report *why* they dropped a record. Splitting that needs
  the per-adapter work the handoff explicitly scopes out of Phase 0.
- The cached `permits` table contains ~285 rows under a stale `sf-bay-area`
  metro value written by an older release. No selection reaches them and no
  adapter produces them; they can be deleted.