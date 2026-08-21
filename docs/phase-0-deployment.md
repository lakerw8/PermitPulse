# Phase 0 deployment

Server-side entitlements and Stripe lifecycle handling. Everything below is
backward compatible with the currently deployed code, so the migration can be
applied before the deploy.

## Order

**1. Apply the migration first.**

Run `supabase/migrations/0001_phase0_entitlements.sql` in the Supabase SQL
editor. It is safe to run while the old release is serving traffic:

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

## Not in this slice

0C (truthful coverage registry) and 0D (typed source health) remain open, along
with 0F (copy alignment). The pricing page still advertises a weekly email
digest that does not exist, and coverage counts are still derived from
`METROS.length` rather than from sources with data.
