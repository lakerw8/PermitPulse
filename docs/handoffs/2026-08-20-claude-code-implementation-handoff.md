# PermitPulse: Claude Code Implementation Handoff

Status: approved implementation brief, based on a read-only review on 2026-08-20  
Reviewed commit: `1a83dc8`  
Primary objective: turn PermitPulse from a broad permit browser into a secure, trustworthy, contact-ready lead product for commercial subcontractors.

## 1. Product outcome

PermitPulse should help a local subcontractor answer one question each morning:

> Which projects are worth contacting today, why do they match my business, and how can I reliably reach the correct GC?

The product is not successful because it indexes many permits or lists many cities. The product is successful when it produces qualified conversations and won work for subcontractors.

The intended value chain is:

```text
municipal source
    -> permit/status event
    -> normalized commercial project
    -> canonical GC organization
    -> verified contact method
    -> trade/territory match
    -> timely alert
    -> outreach and follow-up
    -> won work
```

The first target persona should be an owner or business-development user at a 5 to 50-person HVAC, electrical, plumbing, roofing, concrete, or fire-protection subcontractor operating in one metro.

## 2. Current system

```text
200 adapter keys in src/lib/permit-adapters.ts
                    |
                    v
        weekday Vercel refresh route
                    |
                    v
        Supabase permits table
                    |
        +-----------+------------+
        |                        |
        v                        v
 public permit API         saved_leads table
        |                        |
        v                        v
 permit browser             dashboard/CSV

Stripe webhook -> profiles.plan -> client-side contact unlock
```

Useful foundations already exist:

- Next.js 16 App Router application with strict TypeScript.
- Supabase authentication, cached permits, profiles, and saved leads.
- Stripe Checkout and webhook routes.
- Centralized permit query/filter contract.
- Region picker, permit browser, detail page, lead statuses, notes, and CSV export.
- A consistent design system in `design.md`.

## 3. Verified baseline

A read-only aggregate query of the configured Supabase project returned:

| Metric | Count | Share |
|---|---:|---:|
| Cached permits | 8,160 | 100% |
| Phone present | 583 | 7.1% |
| Email present | 14 | 0.17% |
| `Unknown Contractor` | 3,238 | 39.7% |
| High-confidence contact | 1,195 | 14.6% |
| Medium-confidence contact | 3,721 | 45.6% |
| Low-confidence contact | 3,244 | 39.8% |
| Normalized as Approved | 25 | 0.3% |
| Normalized as Issued | 7,125 | 87.3% |

Static consistency checks returned:

| Coverage registry | Count |
|---|---:|
| Selectable city IDs in `METROS` | 328 |
| Keys in `METRO_ADAPTERS` | 200 |
| Selectable IDs without an exact adapter key | 131 |
| Adapter keys not represented in the selector | 3 |

Some missing city IDs may be represented by a wider municipal source, but there is no explicit alias/resolution layer. The runtime performs exact-key adapter lookups, so a wider source cannot be assumed to cover those selections.

Code health at review time:

- `pnpm exec tsc --noEmit --incremental false`: passes.
- `pnpm exec eslint src`: 4 errors and 8 warnings.
- No test files were found.
- `pnpm lint` scans generated content inside `.claude/worktrees`, producing unusable output.
- `README.md` is still the Create Next App boilerplate.

## 4. Non-negotiable decisions

1. Do not add more cities until advertised coverage is mechanically tied to working, monitored sources.
2. Contact entitlements must be enforced on the server. Blurring data already sent to the browser is not access control.
3. Users must never be able to update their own billing entitlement, trial end, or Stripe identity.
4. Upstream failure must never look like a legitimate zero-result market.
5. Do not label a contact verified without provenance, a verification method, and a timestamp.
6. Preserve source-native status and dates. Normalization must not erase rejected, canceled, expired, revoked, or withdrawn states.
7. Support two opportunity signals:
   - Early signal: filed or under review, providing more relationship-building time.
   - Go signal: approved or issued, providing higher confidence that work will proceed.
8. Expand from a few high-quality launch markets only after measurable quality gates pass.
9. Do not buy or integrate a paid enrichment, email, SMS, or CRM provider without an explicit product decision.
10. Preserve unrelated worktree changes, especially the current `AGENTS.md` memory block.

## 5. Execution order

Implement Phase 0 completely before starting Phase 1. Phase 2 should wait until Phase 1 metrics can be measured in production.

## Phase 0: Secure and stabilize the existing product

### 0A. Enforce paid entitlements on the server

Problem:

- `permits` is publicly readable in `supabase/setup.sql`, including GC contact columns.
- `/api/permits` is unauthenticated and serializes complete GC contacts.
- `LockedContact` and `PermitCard` only hide data visually.
- Authenticated users can update `profiles.plan` and `trial_ends_at` directly.
- The dashboard contains a production-visible Plan Simulator and grants a trial without Stripe.
- The free saved-lead limit is enforced only by client state.

Required changes:

1. Remove direct anonymous/authenticated table access to private contact columns.
2. Make the Next.js API the entitlement boundary for permit reads.
3. Resolve the current user on the server for permit list, permit detail, saved-lead, and CSV responses.
4. Return public permit fields for anonymous/free users. Omit or redact contact fields before serialization.
5. Return contact fields only when a server-owned entitlement is active.
6. Prevent clients from updating `plan`, `trial_ends_at`, `stripe_customer_id`, or future billing fields.
7. Route preference updates through a server endpoint or a column-restricted database operation that accepts only `metro` and `primary_trade`.
8. Remove the production Plan Simulator. A development-only simulator must not persist into production data.
9. Start trials only through Stripe Checkout. Do not set trial fields from the browser.
10. Enforce the free saved-lead limit on the server/database. Direct Supabase inserts must not bypass it.

Recommended entitlement model:

- Treat `profiles` as user preferences and identity metadata.
- Store billing state in service-owned fields or a separate service-only `billing_entitlements` table.
- Derive access from Stripe subscription status. `trialing` and `active` are entitled; `past_due`, `unpaid`, `incomplete`, `incomplete_expired`, `paused`, and `canceled` are not entitled unless an explicit grace-period policy says otherwise.
- Do not trust `plan` values supplied by the client or Checkout metadata without validating the configured Stripe price.

Acceptance criteria:

- Anonymous and free users cannot retrieve any real GC phone/email through REST, Supabase, browser state, page HTML, or CSV.
- A logged-in user cannot make themselves paid by modifying a profile request.
- A free user cannot save a sixth lead, including through direct database/API calls and concurrent requests.
- Paid users can retrieve contacts through entitlement-aware list, detail, dashboard, and export flows.
- Entitlement tests cover anonymous, free, trialing, active, past-due, canceled, and malformed profiles.

Likely files:

- `supabase/setup.sql`
- `supabase/profiles-and-leads.sql`
- new additive Supabase migration files
- `src/app/api/permits/route.ts`
- new `src/app/api/permits/[id]/route.ts`
- new profile/saved-lead API routes as needed
- `src/lib/auth-context.tsx`
- `src/lib/leads-context.tsx`
- `src/components/locked-contact.tsx`
- `src/components/permit-card.tsx`
- `src/app/dashboard/page.tsx`

### 0B. Correct Stripe lifecycle handling

Problem:

- `customer.subscription.updated` currently grants paid access for every subscription status.
- Database update failures are ignored and the webhook still returns success, preventing Stripe retries.
- There is no billing portal despite copy promising dashboard cancellation.
- There is no webhook event ledger or replay protection.

Required changes:

1. Validate webhook signatures and configured Stripe price/product IDs.
2. Persist Stripe customer ID, subscription ID, status, current period end, cancel-at-period-end, and last processed event timestamp.
3. Map only entitled subscription states to contact access.
4. Return a non-2xx response when a required database write fails so Stripe retries.
5. Add idempotent event handling, preferably with a unique Stripe event ID ledger.
6. Add an authenticated Stripe customer-portal route and dashboard action.
7. Reconcile entitlement on Checkout completion and subscription changes.

Acceptance criteria:

- Replaying a webhook does not duplicate or corrupt state.
- Past-due/canceled test events remove access according to the documented policy.
- A failed database update produces a retryable webhook response.
- A user can open the billing portal from the dashboard.
- Tests use Stripe fixtures or constructed event payloads, not the live Stripe service.

Likely files:

- `src/app/api/checkout/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- new `src/app/api/billing/portal/route.ts`
- `src/lib/stripe.ts`
- `src/app/dashboard/page.tsx`
- Supabase migrations

### 0C. Make coverage truthful and mechanically consistent

Problem:

- Customer-facing coverage derives from `METROS.length`.
- Region selection emits city IDs.
- `fetchLivePermits` resolves only exact `METRO_ADAPTERS` keys.
- Cached rows store the requested adapter key in `permits.metro`.
- 131 selectable IDs lack an exact adapter key, while three aggregate adapter keys are not selectable.

Required changes:

1. Create one canonical coverage registry that explicitly maps each customer-selectable market/city to one or more source adapter keys.
2. Mark each entry as operational, preview, disabled, or unsupported.
3. Do not infer coverage from geographic proximity or from membership in a visual region.
4. Resolve selected city IDs through the registry before querying cache or live adapters.
5. Derive marketing counts and picker options only from operational entries.
6. Add a static test that fails when:
   - an operational selectable ID has no adapter resolution;
   - an adapter is unreachable from the registry;
   - a region references an unknown city;
   - duplicate IDs exist;
   - customer copy rounds from a different source of truth.
7. Disable or label any city that has not passed a source smoke test.

Acceptance criteria:

- Every advertised city resolves to at least one operational adapter.
- Every adapter intended for customers is reachable from the selector.
- Selecting an entire region queries each required source once without duplicate permits.
- Marketing coverage counts equal the registry's operational count.
- CI catches registry drift before merge.

Likely files:

- `src/lib/types.ts`
- `src/lib/regions.ts`
- `src/lib/coverage.ts`
- `src/lib/permit-adapters.ts`
- `src/components/region-picker.tsx`
- `src/lib/permits-context.tsx`
- `src/app/api/permits/route.ts`

### 0D. Replace silent source failures with typed health results

Problem:

- `fetchAdapter` returns an empty array for every non-2xx response.
- `Promise.allSettled` drops rejected adapters.
- Refresh logs can report success with zero permits after an upstream failure.
- `/api/permits` catches failures and may return an empty 200 response.
- The refresh endpoint authorizes everyone if `CRON_SECRET` is absent.

Required changes:

1. Make refresh authorization fail closed when configuration is missing.
2. Replace bare `Permit[]` adapter results with a typed result or named errors containing:
   - source/adapter key;
   - HTTP status or network error class;
   - duration;
   - raw record count;
   - accepted permit count;
   - rejected record count and reasons;
   - contact-completeness counts;
   - cursor/window used.
3. Distinguish `success_with_zero_records`, `upstream_error`, `parse_error`, `normalization_error`, and `database_error`.
4. Store health per source adapter, not only per customer-facing metro.
5. Serve stale cached data with explicit freshness metadata when live refresh fails.
6. Return an error state when neither usable cache nor live data exists. Do not return an empty success.
7. Add timeouts and bounded retries with backoff for transient source failures.
8. Ensure one failed adapter does not hide successful sources in the same market.

Acceptance criteria:

- A simulated 500, 429, timeout, malformed JSON, and schema change each produce a distinct logged health result.
- The customer sees stale-data or unavailable-data messaging, not “0 permits,” during source failure.
- Internal health shows last success, failure reason, latency, record counts, and staleness for every operational source.
- Missing `CRON_SECRET` denies refresh requests.

Likely files:

- `src/lib/permit-adapters.ts`
- `src/app/api/permits/route.ts`
- `src/app/api/permits/refresh/route.ts`
- `src/lib/permit-query.ts`
- `supabase/setup.sql`
- `vercel.json`

### 0E. Repair saved-lead, detail, and export behavior

Problem:

- The dashboard joins saved-lead IDs against only the permit page currently loaded in `PermitsContext`.
- Saved leads outside the active region/filter/page disappear.
- CSV exports only saved permits present in the currently loaded permit array.
- Directly loading or refreshing `/permits/[id]` fails because detail uses client memory instead of an ID fetch.
- Delete/status/note mutations update the UI optimistically and ignore database errors.

Required changes:

1. Add an entitlement-aware permit-by-ID endpoint.
2. Fetch saved leads joined with their permit/project data independently of browse state.
3. Move CSV generation to an authenticated server endpoint that exports every saved lead and applies contact entitlements.
4. Make saved-lead mutations await server success or roll back optimistic state on failure.
5. Add visible, actionable errors for save, remove, status, note, and export failures.
6. Validate lead statuses and notes length on the server/database.

Acceptance criteria:

- A saved lead remains visible across region changes, filter changes, pagination, logout/login, and page reload.
- A direct permit URL works in a new browser session.
- CSV row count equals saved-lead count and never leaks contacts to free users.
- Failed mutations do not leave the UI showing unpersisted state.

Likely files:

- `src/app/permits/[id]/page.tsx`
- new `src/app/api/permits/[id]/route.ts`
- `src/app/dashboard/page.tsx`
- `src/lib/leads-context.tsx`
- new saved-lead/export routes
- Supabase migrations

### 0F. Align customer promises with shipped behavior

Current unsupported or overstated claims include:

- full GC name, phone, and email;
- the right decision-maker on every permit;
- weekly email digest;
- cancellation from the dashboard;
- full permit history;
- 24-hour refresh/freshness without a measured service level;
- every listed city having live coverage.

Required changes:

1. Remove or qualify claims until the corresponding acceptance criteria pass.
2. Show contact availability and provenance honestly on each lead.
3. Use measured freshness, such as “last successful source update,” rather than `new Date()` presented as the source update date.
4. Document what High, Medium, and Low confidence mean. Presence of a name alone is not verification.

Acceptance criteria:

- Every customer-facing capability claim maps to a working, tested feature.
- Coverage, contactability, history window, and freshness are derived from measured data.
- Pricing does not promise digest, billing management, or contact fields that are absent.

Likely files:

- `src/app/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/layout.tsx`
- `src/components/locked-contact.tsx`
- `README.md`

## Phase 1: Build the lead-quality foundation

Do not begin this phase until Phase 0 acceptance criteria pass.

### 1A. Preserve permit lifecycle events

The current single-row snapshot cannot answer “when did this become actionable?”

Add an additive lifecycle model that preserves:

- source-native status and status date;
- normalized status without deleting source meaning;
- `first_seen_at` and `last_seen_at`;
- filed, submitted, approved, issued, completed, canceled, expired, rejected, revoked, and withdrawn events where available;
- `actionable_at` and the rule/version that produced it;
- raw source update time versus PermitPulse observation time;
- source record identity and raw snapshot/reference for debugging.

Recommended normalized stages:

```text
filed -> under_review -> approved -> issued -> completed
   \          \             \          \
    rejected   withdrawn      revoked    expired/canceled
```

Invalid or ambiguous transitions must be recorded, not silently coerced.

Implement this alongside the current table first. Backfill and compare before changing customer queries.

### 1B. Separate permits, projects, organizations, and contacts

The current `Permit.gcContact` object embeds incomplete contact data in every permit. Introduce canonical entities:

```text
projects
  -> permits
  -> project_status_events
  -> project_organizations

organizations
  -> organization_aliases
  -> organization_contacts
  -> contractor activity/history

contacts
  -> contact_methods
  -> provenance
  -> verification events
```

Minimum contact-method fields:

- type: phone or email;
- normalized value;
- source/provenance;
- first observed and last observed timestamps;
- last verified timestamp;
- verification method;
- deliverability/validity state;
- confidence reason, not just a label.

Do not choose a paid enrichment vendor inside this implementation. First harvest source-native contractor/license data and create a provider interface plus quality metrics. Vendor selection is a separate product/cost decision.

### 1C. Cluster permits into opportunities

Subcontractors should not see ten unrelated “leads” when one project has ten permit records.

Start with deterministic clustering based on normalized address, parcel identifier where available, source project/application identifier, owner, GC, and time window. Store the clustering rule/version and allow manual correction.

Acceptance criteria:

- Reprocessing the same source record is idempotent.
- One source permit remains traceable to its raw fields and adapter version.
- Project grouping never deletes original permit records.
- A changed GC or status creates history rather than overwriting evidence.

### 1D. Establish launch-market quality gates

Pick three to five metros and two to three trades for the first credible launch. Select them from observed data quality, not city size.

A launch market must meet agreed targets for:

- source refresh success rate;
- p50 and p95 source-to-alert latency;
- commercial classification precision from a manual sample;
- named-GC rate;
- verified phone/email rate;
- duplicate-project rate;
- incorrect-GC rate;
- actionable leads per week.

Suggested initial gate, to be adjusted after customer interviews:

- 99% scheduled refresh execution;
- no source stale for more than two expected refresh intervals;
- at least 80% named GC;
- at least 60% with one verified contact method;
- less than 5% duplicate projects;
- less than 5% incorrect GC in a weekly manual sample.

Do not advertise a market that fails its gate.

## Phase 2: Deliver a daily subcontractor workflow

Start only after Phase 1 metrics can be measured.

### 2A. Saved searches and alerts

Support saved criteria for:

- service area or radius;
- trade;
- early versus go signal;
- project type;
- value range;
- minimum contactability/confidence;
- GC watchlist or exclusion;
- alert cadence.

Implement the schema, matching logic, idempotent alert queue, and delivery ledger before selecting an email/SMS provider. Do not send the same project-event alert twice.

### 2B. Ranked lead inbox

Rank leads using a versioned, explainable score based on:

- freshness;
- early/go stage;
- trade fit;
- distance/service area;
- project value;
- contactability and verification freshness;
- GC activity in the user's trade/market;
- user feedback and prior actions.

Every lead must show “Why this matches you.” Avoid an opaque AI score.

### 2C. Outreach and feedback loop

Add:

- click-to-call and click-to-email;
- outreach status and timestamp;
- next follow-up date and reminders;
- incorrect-contact and wrong-project feedback;
- contacted, qualified, bid, won, lost, and not-relevant outcomes;
- optional loss reason.

Any automated or templated outreach requires a separate compliance review before launch.

### 2D. Integrations

Do not build broad integrations early. Start with reliable CSV after Phase 0. Add one CRM integration only after pilot customers identify a consistent need.

## 6. Testing requirements

No phase is complete without tests.

### Unit tests

- `mapStatus` for every positive, negative, missing, and ambiguous source status.
- `classifyTrades` with positive matches, false-positive traps, residential cases, and empty descriptions.
- Coverage registry consistency and alias resolution.
- Contact redaction and entitlement resolution.
- Lead scoring/versioning when introduced.
- Project clustering rules when introduced.

### Adapter fixture tests

Create recorded/sanitized JSON fixtures for every source family. Do not make normal CI depend on live municipal APIs.

Each operational adapter must test:

- valid source response;
- zero records;
- malformed response;
- missing fields;
- invalid dates and coordinates;
- upstream 429/500/timeout;
- residential exclusion;
- contractor/contact extraction;
- stable permit identity;
- source status normalization.

Split the 5,600-line adapter file by source family or jurisdiction as fixtures are added. Do not perform a blind rewrite. Preserve behavior and move verified adapters incrementally.

### Integration tests

- Anonymous/free/paid permit responses.
- Direct Supabase access restrictions.
- Free saved-lead limit under concurrent requests.
- Saved lead joined with permit/project data.
- CSV contact redaction.
- Refresh result and health logging.
- Webhook status transitions, failures, idempotency, and replay.

### End-to-end tests

- Browse as anonymous, sign in, save a lead, reload, and see it on the dashboard.
- Open a permit detail URL in a fresh session.
- Free user cannot reveal or export contacts.
- Trialing/active user can reveal and export contacts.
- Past-due/canceled user loses access according to policy.
- Source failure renders stale/unavailable state instead of zero results.

### Required checks

At minimum:

```bash
pnpm exec tsc --noEmit --incremental false
pnpm exec eslint src
pnpm test
```

Add a real `test` script. Fix ESLint ignores so `.claude/worktrees/**`, nested `.next/**`, and other generated outputs do not pollute normal lint runs.

## 7. Observability requirements

Create an internal source-health view or query with:

- adapter/source key;
- operational coverage entries;
- last attempt and last success;
- next expected refresh;
- latency;
- HTTP/error classification;
- records received, accepted, and rejected;
- rejection reasons;
- contact completeness;
- current staleness;
- consecutive failure count.

Alert on:

- missed refresh window;
- consecutive upstream failures;
- unexpected zero records versus historical baseline;
- schema/parse failures;
- major drop in permit volume or contactability;
- webhook failures;
- alert queue backlog.

Never log secrets, access tokens, full raw personal contact records, or unrestricted webhook payloads.

## 8. Product metrics

Use these instead of nominal city count:

### Data quality

- operational advertised markets;
- source refresh success rate;
- source publication to customer alert, p50/p95;
- named-GC rate;
- verified-phone and verified-email rate;
- incorrect-GC rate;
- duplicate-project rate;
- stale-source count.

### User value

- leads viewed, saved, and contacted per active subscriber;
- qualified GC conversations per subscriber per week;
- median time from alert to outreach;
- Contacted -> Qualified -> Bid -> Won conversion;
- attributed pipeline and won revenue;
- incorrect-contact feedback rate;
- weekly active paid users and paid churn.

Primary north-star candidate:

> Qualified GC conversations generated per active paid subscriber per week.

Do not use total permits or listed cities as the north-star metric.

## 9. Rollout sequence

1. Add migrations in backward-compatible form.
2. Deploy server-side entitlement enforcement before relying on new client behavior.
3. Verify anonymous and free data redaction in production.
4. Remove client-owned entitlement updates and the production simulator.
5. Deploy coverage registry and disable unsupported markets.
6. Deploy typed source health and stale-data behavior.
7. Repair saved-lead/detail/export flows.
8. Correct marketing copy.
9. Run a manual security and data-quality smoke test.
10. Pilot Phase 1 in a few markets behind an explicit feature flag or allowlist.
11. Backfill lifecycle/project/contact models and compare against current output before cutover.
12. Expand one market at a time only after the market gate passes.

Every database migration needs a forward sequence, rollback/disable plan, and compatibility note for old code running during deployment.

## 10. Phase 0 definition of done

Phase 0 is complete only when all of the following are true:

- No real GC contact data is retrievable by anonymous or free users.
- Users cannot alter their billing entitlement or trial.
- The saved-lead limit is enforced server-side under concurrency.
- Stripe entitlement follows tested subscription states.
- Every advertised city resolves to a monitored operational source.
- An upstream error cannot appear as a legitimate zero-permit response.
- Every source exposes freshness and health metadata.
- Direct permit links work after reload and in a fresh session.
- Every saved lead appears in the dashboard and complete CSV export.
- Unsupported product claims are removed or implemented.
- Typecheck, lint, unit, integration, and critical end-to-end tests pass.
- README documents setup, architecture, migrations, refresh operation, source health, tests, and deployment.

## 11. Files to inspect first

Read these before proposing edits:

- `AGENTS.md`
- `design.md`
- `docs/superpowers/specs/2026-08-19-simplified-pricing-design.md`
- `supabase/setup.sql`
- `supabase/profiles-and-leads.sql`
- `src/lib/types.ts`
- `src/lib/permit-adapters.ts`
- `src/lib/permit-query.ts`
- `src/lib/auth-context.tsx`
- `src/lib/leads-context.tsx`
- `src/lib/permits-context.tsx`
- `src/app/api/permits/route.ts`
- `src/app/api/permits/refresh/route.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/permits/[id]/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/lib/regions.ts`
- `src/lib/coverage.ts`
- `vercel.json`

Before writing Next.js code, read the relevant Next.js 16 guides under `node_modules/next/dist/docs/` as required by `AGENTS.md`.

## 12. Ready-to-paste Claude Code prompt

```text
Read AGENTS.md and docs/handoffs/2026-08-20-claude-code-implementation-handoff.md completely before acting.

Implement Phase 0 only. Do not start Phase 1 or Phase 2, do not add cities, and do not perform a broad adapter rewrite.

First inspect the current git status and preserve all unrelated changes, especially the existing AGENTS.md memory block. Read the relevant Next.js 16 documentation from node_modules/next/dist/docs/ before writing Next.js code.

Then produce a short execution plan mapping Phase 0A through 0F to concrete migrations, routes, components, tests, and rollout order. Identify any product decision that truly blocks safe implementation. Do not invent paid external providers.

Implement in small, verifiable slices in this order:
1. server-side entitlements and database permissions;
2. Stripe lifecycle and billing portal;
3. truthful coverage registry and consistency tests;
4. typed source failures and health reporting;
5. saved-lead, detail, and CSV correctness;
6. customer copy alignment and project documentation.

Use additive, backward-compatible database migrations. Never expose secrets or real contact records in logs/tests. Add unit, integration, and critical end-to-end tests. Fix lint configuration for generated worktrees.

After each slice, run the relevant focused tests. At the end run typecheck, lint, the full test suite, and a production build. Report:
- files changed;
- migrations and deployment order;
- security properties verified;
- coverage consistency result;
- tests/checks run and exact outcomes;
- unresolved decisions or risks;
- explicit confirmation that Phase 1/2 were not started.
```

## 13. Decisions still requiring the product owner

These do not block most of Phase 0, but Claude Code must not silently decide them:

1. Initial three to five launch metros.
2. Initial two to three subcontractor trades.
3. Grace-period policy for past-due Stripe subscriptions.
4. Whether free users may see the GC company name while phone/email remain locked.
5. Target contactability and incorrect-GC thresholds for market launch.
6. External enrichment provider, if any.
7. Email/SMS delivery provider and alert cadence.
8. Whether the paid plan remains unlimited or eventually uses contact reveals/credits.

Phase 0 should use the safest reversible default where possible and record any temporary assumption in the implementation report.
