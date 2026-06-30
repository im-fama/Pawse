-- Pawse mood tracking schema (multi-user with Supabase Auth)
-- Run in Supabase: SQL Editor → New query → paste → Run
--
-- Each signed-in user gets their own mood_logs rows (RLS enforced).
-- Mood ids must stay in sync with src/data/moods.js
--
-- NOTE: This drops and recreates mood_logs. Back up first if you have data to keep.
-- ---------------------------------------------------------------------------
-- mood_logs
-- ---------------------------------------------------------------------------
drop table if exists public.mood_logs cascade;
create table public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mood text not null,
  created_at timestamptz not null default now(),
  constraint mood_logs_mood_valid check (
    mood in (
      'happy',
      'overjoyed',
      'miss_you',
      'in_love',
      'love_overdose',
      'cozy',
      'sad',
      'frustrated',
      'angry',
      'on_fire',
      'evil',
      'naughty',
      'hungry',
      'shocked',
      'scared',
      'confused',
      'laughy',
      'silly',
      'cutesy',
      'exhausted',
      'sleepy'
    )
  )
);
create index mood_logs_user_created_at_idx on public.mood_logs (user_id, created_at desc);
comment on table public.mood_logs is 'One row per mood check-in. Scoped to the signed-in user via user_id.';
-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.mood_logs enable row level security;
create policy "Users can view own mood logs" on public.mood_logs for
select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own mood logs" on public.mood_logs for
insert to authenticated with check (auth.uid() = user_id);
-- ---------------------------------------------------------------------------
-- Cleanup from older schema versions
-- ---------------------------------------------------------------------------
drop trigger if exists mood_logs_sync_pet_state on public.mood_logs;
drop function if exists public.sync_pet_state_from_mood_log();
drop table if exists public.pet_state cascade;