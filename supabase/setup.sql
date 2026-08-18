-- PermitPulse: cached permits table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

create table if not exists permits (
  id text primary key,
  permit_number text not null,
  address text not null,
  city text not null,
  state text not null,
  zip text not null,
  latitude double precision not null,
  longitude double precision not null,
  filing_date date not null,
  description text not null,
  estimated_value numeric not null,
  status text not null,
  trades text[] not null default '{}',
  gc_company_name text,
  gc_contact_name text,
  gc_phone text,
  gc_email text,
  gc_confidence text not null default 'Low',
  source text not null,
  source_updated_at text,
  metro text not null,
  fetched_at timestamptz not null default now()
);

create index if not exists idx_permits_metro on permits (metro);
create index if not exists idx_permits_filing_date on permits (filing_date desc);
create index if not exists idx_permits_metro_date on permits (metro, filing_date desc);

-- Enable RLS (required for Supabase best practices)
alter table permits enable row level security;

-- Public read access (permits are public data)
create policy "Permits are publicly readable"
  on permits for select
  to anon, authenticated
  using (true);

-- Only service role can insert/update/delete (via API routes)
-- No policy needed — service role bypasses RLS

-- Refresh log to track when each metro was last refreshed
create table if not exists refresh_log (
  metro text primary key,
  last_refreshed_at timestamptz not null default now(),
  permit_count integer not null default 0,
  status text not null default 'success',
  error_message text
);

alter table refresh_log enable row level security;

create policy "Refresh log is publicly readable"
  on refresh_log for select
  to anon, authenticated
  using (true);
