-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)
-- Supabase's `auth.users` table is created automatically; we just reference it.

-- ============================================================
-- Table: mood_logs
-- One row per check-in. Session-based, so multiple rows/day are fine.
-- ============================================================
create table if not exists mood_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  mood text not null,
  created_at timestamptz default now() not null
);

create index if not exists mood_logs_user_id_created_at_idx
  on mood_logs (user_id, created_at desc);

-- ============================================================
-- Table: pet_state
-- One row per user. Tracks last_seen for the "days apart" calc.
-- streak_days_apart is denormalized here for fast reads, but the
-- source of truth for "days since last seen" is always
-- now() - last_seen, computed client-side or in a view.
-- ============================================================
create table if not exists pet_state (
  user_id uuid references auth.users(id) on delete cascade primary key,
  last_seen timestamptz default now() not null,
  streak_days_apart int default 0 not null,
  last_mood text
);

-- ============================================================
-- Row Level Security
-- Each user can only read/write their own rows.
-- ============================================================
alter table mood_logs enable row level security;
alter table pet_state enable row level security;

create policy "Users can view own mood logs"
  on mood_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own mood logs"
  on mood_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can view own pet state"
  on pet_state for select
  using (auth.uid() = user_id);

create policy "Users can insert own pet state"
  on pet_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pet state"
  on pet_state for update
  using (auth.uid() = user_id);
