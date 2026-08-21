-- PermitPulse Phase 0A: move entitlement enforcement into the database.
--
-- Additive and idempotent. Safe to run while the previous release is still
-- serving traffic: it only removes privileges the old client never needed
-- (it read permits through /api/permits, never the table directly) and adds
-- columns the old code ignores.
--
-- Run AFTER setup.sql and profiles-and-leads.sql.

-- ---------------------------------------------------------------------------
-- 1. GC contact columns stop being world-readable.
--
-- `permits` keeps its public read policy so the browse experience still works
-- for anonymous visitors, but the four columns the paid plan sells are no
-- longer reachable with the anon key. Column privileges are checked
-- independently of RLS, so this holds even though the row policy says
-- `using (true)`.
-- ---------------------------------------------------------------------------

revoke select on public.permits from anon, authenticated;

grant select (
  id, permit_number, address, city, state, zip,
  latitude, longitude, filing_date, description, estimated_value,
  status, trades, gc_confidence, source, source_updated_at, metro, fetched_at
) on public.permits to anon, authenticated;

-- Derived "does a value exist" flags, so a locked viewer can be told that a
-- permit has a named GC and a phone number without being sent either. Stored
-- generated columns keep them in sync with the source values automatically,
-- and they are safe to expose because they carry no personal data.
alter table public.permits
  add column if not exists has_gc_company boolean
    generated always as (
      gc_company_name is not null
      and btrim(gc_company_name) <> ''
      and gc_company_name <> 'Unknown Contractor'
    ) stored,
  add column if not exists has_gc_contact_name boolean
    generated always as (gc_contact_name is not null and btrim(gc_contact_name) <> '') stored,
  add column if not exists has_gc_phone boolean
    generated always as (gc_phone is not null and btrim(gc_phone) <> '') stored,
  add column if not exists has_gc_email boolean
    generated always as (gc_email is not null and btrim(gc_email) <> '') stored;

grant select (has_gc_company, has_gc_contact_name, has_gc_phone, has_gc_email)
  on public.permits to anon, authenticated;

-- refresh_log carries upstream error strings (which can embed source URLs and
-- query parameters). Nothing in the client reads it; serve it via the API.
revoke select on public.refresh_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Billing state becomes service-owned.
--
-- `profiles` stays the single row per user, but the billing columns are now
-- writable only by the service role. `authenticated` keeps UPDATE on exactly
-- the two preference columns the settings UI edits.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists billing_updated_at timestamptz;

revoke update on public.profiles from anon, authenticated;

grant update (metro, primary_trade, updated_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 3. One definition of "entitled", shared by the database and the app.
--
-- Stripe's status is authoritative once we have it. Rows written before the
-- status column existed fall back to `plan`, but only when the profile also
-- carries a Stripe customer id — that is what separates a real (if stale)
-- customer from a row the removed client-side Plan Simulator wrote.
-- ---------------------------------------------------------------------------

create or replace function public.profile_is_entitled(p public.profiles)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when p.subscription_status in ('trialing', 'active') then true
    when p.subscription_status is not null then false
    when p.stripe_customer_id is not null and coalesce(p.plan, 'free') <> 'free' then true
    when p.stripe_customer_id is not null
         and p.trial_ends_at is not null
         and p.trial_ends_at > now() then true
    else false
  end
$$;

-- ---------------------------------------------------------------------------
-- 4. The free saved-lead limit becomes a database invariant.
--
-- The per-user advisory lock makes the count-then-insert sequence safe under
-- concurrent requests: two simultaneous saves from the same user serialize
-- instead of both observing four rows and both inserting a fifth.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_saved_lead_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  free_limit constant integer := 5;
  entitled boolean;
  lead_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  select public.profile_is_entitled(p) into entitled
  from public.profiles p
  where p.id = new.user_id;

  if coalesce(entitled, false) then
    return new;
  end if;

  select count(*) into lead_count
  from public.saved_leads
  where user_id = new.user_id;

  if lead_count >= free_limit then
    raise exception 'free plan is limited to % saved leads', free_limit
      using errcode = 'check_violation', hint = 'FREE_LEAD_LIMIT';
  end if;

  return new;
end;
$$;

drop trigger if exists saved_leads_free_limit on public.saved_leads;
create trigger saved_leads_free_limit
  before insert on public.saved_leads
  for each row execute function public.enforce_saved_lead_limit();

-- ---------------------------------------------------------------------------
-- 5. Stripe event ledger for idempotent webhook processing.
--
-- Insert-before-process: a duplicate delivery collides on the primary key and
-- is acknowledged without re-running the handler.
-- ---------------------------------------------------------------------------

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text
);

alter table public.stripe_events enable row level security;

revoke all on public.stripe_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Input bounds on saved leads.
--
-- Last because these are the only statements that can fail on existing data:
-- they validate every current row. If one errors, everything above has already
-- taken effect. Inspect the offending rows, fix them, and re-run this section.
-- ---------------------------------------------------------------------------

alter table public.saved_leads
  drop constraint if exists saved_leads_status_check;
alter table public.saved_leads
  add constraint saved_leads_status_check
  check (status in ('New', 'Saved', 'Contacted', 'Not Relevant', 'Won'));

alter table public.saved_leads
  drop constraint if exists saved_leads_notes_length_check;
alter table public.saved_leads
  add constraint saved_leads_notes_length_check
  check (char_length(notes) <= 2000);
