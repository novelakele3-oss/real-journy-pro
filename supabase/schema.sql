-- ─────────────────────────────────────────────────────────────
-- TradeJournal Pro — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── profiles ───────────────────────────────────────────────
-- One row per user. Stores the onboarding/"setup" data
-- (prop firm or broker, account size, pairs, challenge rules, etc.)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  setup      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─── trades ─────────────────────────────────────────────────
-- One row per imported trade. The full trade object (as produced
-- by src/utils/analytics.js parseCSV) is stored as JSONB so the
-- frontend code doesn't need to change shape.
create table if not exists public.trades (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  trade      jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists trades_user_id_idx on public.trades (user_id);
create index if not exists trades_open_time_idx on public.trades ((trade ->> 'openTime'));

alter table public.trades enable row level security;

drop policy if exists "trades_select_own" on public.trades;
create policy "trades_select_own"
  on public.trades for select
  using (auth.uid() = user_id);

drop policy if exists "trades_insert_own" on public.trades;
create policy "trades_insert_own"
  on public.trades for insert
  with check (auth.uid() = user_id);

drop policy if exists "trades_update_own" on public.trades;
create policy "trades_update_own"
  on public.trades for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "trades_delete_own" on public.trades;
create policy "trades_delete_own"
  on public.trades for delete
  using (auth.uid() = user_id);
