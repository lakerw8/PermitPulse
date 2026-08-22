-- PermitPulse Phase 0D: per-source health.
--
-- Additive. `refresh_log` stays as it is so the previous release keeps writing
-- and reading it while this rolls out; the new table records the same runs at
-- adapter granularity with the detail needed to tell a genuine empty market
-- apart from a broken source.

create table if not exists public.source_health (
  -- "<metro key>#<domain>", stable across array reordering. Unique because
  -- only one metro configures more than one adapter and those differ by host.
  adapter_key text primary key,
  metro text not null,
  city text,
  state text,
  domain text,

  -- success | success_with_zero_records | upstream_error | parse_error
  -- | normalization_error | database_error
  outcome text not null,

  last_attempt_at timestamptz not null default now(),
  last_success_at timestamptz,

  http_status integer,
  error_class text,
  error_message text,
  duration_ms integer,

  raw_record_count integer not null default 0,
  accepted_count integer not null default 0,
  rejected_count integer not null default 0,
  -- { "residential": 12, "missing_address": 3, ... }
  rejection_reasons jsonb not null default '{}'::jsonb,

  with_company_count integer not null default 0,
  with_phone_count integer not null default 0,
  with_email_count integer not null default 0,

  -- Contacts dropped because one number served many companies: a permit-desk
  -- line rather than a contractor's. See src/lib/lead-quality.ts.
  suppressed_contact_count integer not null default 0,
  -- How many companies the worst shared contact covered. A high number is a
  -- source publishing an office line as though it were the GC's.
  shared_contact_companies integer not null default 0,

  window_days integer,
  window_start date,

  consecutive_failures integer not null default 0
);

create index if not exists idx_source_health_metro on public.source_health (metro);
create index if not exists idx_source_health_outcome on public.source_health (outcome);

alter table public.source_health enable row level security;

-- Service role only. It carries upstream URLs and error strings; the customer
-- view of coverage is served through /api/coverage instead.
revoke all on public.source_health from anon, authenticated;

-- refresh_log gains the one field it needs to stop lying: a run that fetched
-- nothing because the upstream failed is no longer indistinguishable from a
-- market that genuinely had no permits.
alter table public.refresh_log
  add column if not exists failed_source_count integer not null default 0,
  add column if not exists source_count integer not null default 0;
