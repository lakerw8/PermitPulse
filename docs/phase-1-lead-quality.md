# Phase 1D: lead quality and launch markets

Status: measurement and enforcement shipped. Market selection is a decision for
the product owner; the data to make it is below.

## The finding

Platform-wide contact coverage reads as "5.5% of permits carry a phone", which
sounds like a thin but even spread. It is not. Reachability is concentrated in
a handful of markets and absent everywhere else — New York (583 permits),
Chicago (194) and Philadelphia (225) are all at **zero**.

Worse, the market that looked best was the one to trust least.

### Peoria, AZ

200 permits, 200 phone numbers, every one marked **High confidence**. One
distinct number: `623-773-7225 Option1`, attached to 105 different companies.
It is the City of Peoria's own permit desk.

A subcontractor paying for that market would have called 200 leads and reached
the city switchboard every time — and the confidence label told them the data
was good. The source publishes the field faithfully; nothing downstream asked
whether a contractor's phone should be the same on every permit in the city.

Peoria also hardcodes `estimatedValue: 100000` on every record, as do 19 other
adapters (13 of them to that same figure). Those values are filtered and sorted
on as if measured.

## What now enforces this

`src/lib/lead-quality.ts`:

- **Shared-contact suppression.** A phone or email attached to more than two
  distinct company names is a switchboard, not a contractor. It is stripped
  before storage and the permit drops to Low confidence. Checked against the
  whole cache, this rule catches Peoria's 200 records and touches nothing else
  — at every threshold from 2 to 6 the split is identical, because a real GC
  pulling forty permits appears under one company name.
- **Constant-value detection.** Flags a source where most permits carry the
  same non-zero project value.
- **Market gate.** Per market: permit count, named-GC rate, reachability, phone
  distinctness, synthetic-value share — evaluated against thresholds with
  written reasons for each failure.

`GET /api/admin/market-quality` (bearer `CRON_SECRET`) runs it over the cache.

## Gate results, run over the real cache

Default thresholds: 50+ permits, 80% named GC, 60% reachable, 25% phone
distinctness, under 50% synthetic values.

**2 of 145 markets pass: Austin and Miami.**

| Market | Permits | Named GC | Reachable | Phone distinct | Verdict |
|---|---:|---:|---:|---:|---|
| austin | 158 | 99% | 99% | 29% | **pass** |
| miami | 170 | 100% | 82% | 76% | **pass** |
| tallahassee | 14 | 100% | 100% | 79% | too small |
| orlando | 200 | 68% | 35% | 61% | named GC, reachability |
| anaheim | 200 | 34% | 34% | 47% | named GC, reachability |
| peoria | 200 | 100% | **0%** after suppression | — | reachability |

Austin's 29% phone distinctness is above the floor and looks genuine on
inspection: the repeats are large local GCs (Harvey Cleary, Cadence McShane)
pulling many permits under one company name, which is a real lead, not a shared
line.

## The decision this leaves open

The handoff asks for three to five launch metros. **The data supports two.**
Options, in the order I would consider them:

1. **Launch on Austin and Miami only.** Honest, and both clear the bar
   comfortably. A two-market product is a much smaller product.
2. **Lower the reachability threshold** to something like 30% and add Orlando.
   That means telling customers most leads have a company name and no phone.
3. **Fix the input first.** Run the contractor-license-registry spike before
   picking markets at all — if it works, market selection stops being
   constrained by which cities happen to publish phone numbers.

I would do (3) before committing to (1) or (2). Choosing launch markets from
five candidate markets is choosing between accidents of municipal data policy,
not building a moat.

Trade selection is less constrained: Electrical (14% of permits), Plumbing
(10%), Concrete (9%), HVAC (8%) all have volume. "General Construction" covers
69% and is the catch-all rather than a trade.

## Not done

- **1B, the entity graph.** Deliberately deferred. With 0.2% email coverage,
  building a canonical organization/contact model would be a month of schema
  work over data that does not exist.
- **1C, project clustering.** Not started. It is the prerequisite for bringing
  the excluded county-level adapters back.
- **The synthetic `estimatedValue` in 20 adapters is detected but not
  suppressed.** Nulling it would change what every customer sees in filters and
  sorting, which is a product call rather than a bug fix.

---

# Phase 1A: permit lifecycle

## The bug underneath the model

`mapStatus` did not merely flatten the source's meaning, it inverted it:

```js
if (s.includes("denied") || s.includes("reject") || s.includes("revok"))
  return "Under Review";                 // a refused permit, sold as a live lead
if (s.includes("expire") || s.includes("cancel") || s.includes("withdraw"))
  return "Completed";                    // a dead project, sold as a finished one
return "Issued";                         // anything unrecognised, sold as the
                                         // strongest go-signal the product has
```

Measured against four live sources, 400 records each:

| Source | Dead permits previously shown as live or finished | Records previously claimed "Issued" on no evidence |
|---|---:|---:|
| Seattle | 43 cancelled/expired shown as Completed | 0 |
| Austin | 33 expired/cancelled/withdrawn | 317 |
| Chicago | 123 | 192 |
| New York | 0 (21 under-review shown as Issued) | 0 |

## The model

`src/lib/lifecycle.ts` defines eleven stages and four opportunity signals:

```text
filed -> under_review -> approved -> issued -> completed
   \          \             \          \
    rejected   withdrawn      revoked    expired/canceled
```

- `early` — filed, under review. More time to build a relationship.
- `go` — approved, issued. The work is likely to proceed.
- `closed` — completed or dead, either way not a lead.
- `none` — **unknown**. Silence is not a green light.

Negative outcomes are matched before positive ones, so "Issued - Revoked" reads
as revoked. Approved is matched before issued, so "Ready to Issue" is not
promoted to a permit that has not been granted.

`mapStatus` is now a thin wrapper over `classifyStage`, so all 107 adapter call
sites got the correction without being touched.

## Recovering the source's own words

The handoff requires the source-native status be preserved. Threading it
through 107 adapter signatures would have been a blind rewrite, so
`extractSourceStatus` recovers it from the raw record instead, using the field
names the adapters actually read — `status`, `PERMIT_STATUS`, `B1_APPL_ST`,
`APP STATUS`, `USER_Current_Stage___Display` and the rest, normalized for
punctuation.

Where a record carries no status at all, `inferStageFromQuery` reads it from
the request we made: a query filtering `issue_date >= X` returns issued permits
by construction. This was added after measuring the change — without it,
Chicago's statusless records became "Status Unknown", which is *less* accurate
than the truth the query proves. A published status always overrides the
inference; the inference is recorded as such.

## Storage

`supabase/migrations/0003_permit_lifecycle.sql`, additive:

- `permits` gains `source_status`, `lifecycle_stage`, `opportunity_signal`,
  `first_seen_at`, `last_seen_at`, `actionable_at`, `lifecycle_rule_version`.
- `permit_events` records one row per (permit, stage) with the previous stage,
  whether the transition was legal, the source's update time versus ours, the
  rule version, and — only for unreadable statuses and invalid transitions — the
  raw record.

`first_seen_at` and `actionable_at` are never moved once set: a three-week-old
opportunity must not look new because it was refreshed today.

Re-reading an unchanged permit appends nothing. The unique constraint on
(permit_id, lifecycle_stage) makes reprocessing idempotent; what changes is
`last_seen_at`.

Invalid transitions — `issued` back to `under_review`, anything leaving a
terminal stage — are stored with `transition_valid = false` rather than
coerced. Sources do correct themselves, and that is information about the
source.

## Deploy

Additive; deploy in any order relative to 0C/0D. `permits.status` keeps being
written, so the old and new columns can be compared over a few refreshes before
any customer query moves across.

**Expect the visible status mix to change on the first refresh after deploy.**
Permits that were labelled "Issued" on no evidence become "Status Unknown", and
dead permits start appearing as Rejected / Withdrawn / Revoked / Expired /
Canceled. That is the correction, not a regression — but the pricing and
landing copy should be re-read once the real distribution is visible.

## Still not done

- **Backfill.** Existing cached rows have no lifecycle columns until their next
  refresh. Nothing reads them for customer queries yet, so this is safe, but a
  backfill is needed before they drive anything.
- **The date-per-stage fields** the handoff lists (filed, approved, issued,
  completed dates where available) are captured as events with an observation
  time, not as source-published per-stage dates. Those live in fields the
  adapters do not currently read.