-- PermitPulse Phase 1A: permit lifecycle.
--
-- Additive and non-breaking. The existing `permits.status` column keeps its
-- meaning and keeps being written; the columns and table added here run
-- alongside it so the two can be compared before any customer query moves
-- over.

-- ---------------------------------------------------------------------------
-- 1. Lifecycle columns on permits.
--
-- These answer the question a single-row snapshot cannot: not "what is this
-- permit now", but "when did it become worth calling about, and what did the
-- city actually say".
-- ---------------------------------------------------------------------------

alter table public.permits
  -- Exactly what the source published, never normalized away.
  add column if not exists source_status text,
  -- filed | under_review | approved | issued | completed
  -- | rejected | withdrawn | revoked | expired | canceled | unknown
  add column if not exists lifecycle_stage text,
  -- early | go | closed | none
  add column if not exists opportunity_signal text,
  -- When PermitPulse first and last observed this permit, as distinct from
  -- any date the source reports.
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  -- First observation at a stage a subcontractor could act on.
  add column if not exists actionable_at timestamptz,
  add column if not exists lifecycle_rule_version integer;

create index if not exists idx_permits_stage on public.permits (lifecycle_stage);
create index if not exists idx_permits_signal_date
  on public.permits (opportunity_signal, filing_date desc);
create index if not exists idx_permits_actionable
  on public.permits (actionable_at desc);

grant select (
  source_status, lifecycle_stage, opportunity_signal,
  first_seen_at, last_seen_at, actionable_at, lifecycle_rule_version
) on public.permits to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. The event log.
--
-- One row per (permit, stage) rather than per observation: re-reading an
-- unchanged permit every weekday must not append a row, so reprocessing the
-- same source record is idempotent. What changes on a re-read is
-- `permits.last_seen_at`, not this table.
-- ---------------------------------------------------------------------------

create table if not exists public.permit_events (
  id bigint generated always as identity primary key,
  permit_id text not null,
  metro text not null,
  adapter_key text,

  source_status text,
  lifecycle_stage text not null,
  opportunity_signal text not null,

  -- The stage this permit was in when we last looked, and whether moving to
  -- the current one is a legal progression. An invalid move is recorded as
  -- what it is; it is never silently coerced into a legal one.
  previous_stage text,
  transition_valid boolean not null default true,

  -- The source's own update time, kept separate from when we observed it.
  source_updated_at text,
  observed_at timestamptz not null default now(),

  lifecycle_rule_version integer not null,

  -- Kept only for the cases that need debugging: a stage we could not read,
  -- or a transition that should not have happened. Storing every record would
  -- duplicate the whole dataset, including personal data, for no benefit.
  raw_record jsonb,

  unique (permit_id, lifecycle_stage)
);

create index if not exists idx_permit_events_permit
  on public.permit_events (permit_id, observed_at desc);
create index if not exists idx_permit_events_signal
  on public.permit_events (opportunity_signal, observed_at desc);
create index if not exists idx_permit_events_invalid
  on public.permit_events (transition_valid)
  where transition_valid = false;

alter table public.permit_events enable row level security;

-- Read-only for customers; only the service role writes. The event log is
-- public-record permit history, but `raw_record` can hold contact fields, so
-- it is not exposed until a customer-facing view selects columns explicitly.
revoke all on public.permit_events from anon, authenticated;
