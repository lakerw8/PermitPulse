-- PermitPulse: user profiles and saved leads
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- User profiles (auto-created on sign-up via trigger)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'free',
  metro text not null default 'chicago',
  primary_trade text,
  trial_ends_at timestamptz,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Auto-create profile on user sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Saved leads per user
create table if not exists saved_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  permit_id text not null,
  status text not null default 'Saved',
  notes text not null default '',
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permit_id)
);

create index if not exists idx_saved_leads_user on saved_leads (user_id);

alter table saved_leads enable row level security;

create policy "Users can read own leads"
  on saved_leads for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own leads"
  on saved_leads for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own leads"
  on saved_leads for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own leads"
  on saved_leads for delete
  to authenticated
  using ((select auth.uid()) = user_id);
