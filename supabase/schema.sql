-- Pawse mood tracking schema (multi-user with Supabase Auth)
-- Run in Supabase: SQL Editor → New query → paste → Run
--
-- Each signed-in user gets their own mood_logs rows (RLS enforced).
-- Mood ids must stay in sync with src/data/moods.js
--
-- NOTE: This drops and recreates mood_logs. Back up first if you have data to keep.
--
-- IMPORTANT: This script only touches tables in the `public` schema. It does
-- NOT touch `auth.users`, which is Supabase Auth's own table. If you re-run
-- this script to "reset" your data, old test accounts will still exist in
-- auth.users even though public.users is empty again — so signing up with
-- the same email will still say "User already registered". To fully reset,
-- either delete the accounts from Supabase Dashboard → Authentication →
-- Users, or run `delete from auth.users;` (this cascades and also removes
-- the matching public.users / mood_logs rows).
-- ---------------------------------------------------------------------------
-- mood_logs
-- ---------------------------------------------------------------------------
drop table if exists public.mood_logs cascade;
create table public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mood text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint mood_logs_mood_valid check (
    mood in (
      'happy',
      'overjoyed',
      'miss_you',
      'in_love',
      'dreamy',
      'calm',
      'excited',
      'romantic',
      'jealous',
      'lonely',
      'furious',
      'dead',
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
      'goofy',
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
create policy "Users can update own mood logs" on public.mood_logs for
update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ---------------------------------------------------------------------------
-- Cleanup from older schema versions
-- ---------------------------------------------------------------------------
drop trigger if exists mood_logs_sync_pet_state on public.mood_logs;
drop function if exists public.sync_pet_state_from_mood_log();
drop table if exists public.pet_state cascade;

-- ---------------------------------------------------------------------------
-- Reminder state
-- ---------------------------------------------------------------------------
drop table if exists public.user_reminder_state cascade;
create table public.user_reminder_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reminder_stage integer not null default 0,
  last_mood_logged_at timestamptz,
  last_reminder_sent_at timestamptz,
  updated_at timestamptz not null default now()
);
create index user_reminder_state_updated_at_idx on public.user_reminder_state (updated_at desc);
comment on table public.user_reminder_state is 'Tracks when reminder emails have been sent for a user.';

alter table public.user_reminder_state enable row level security;
create policy "Users can view own reminder state" on public.user_reminder_state for
select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own reminder state" on public.user_reminder_state for
insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own reminder state" on public.user_reminder_state for
update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Cleanup: remove profiles table and its trigger (replaced by public.users)
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.profiles cascade;


drop table if exists public.private_messages cascade;
create table public.private_messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users not null,
  recipient_id uuid references auth.users not null,
  text text not null check (char_length(text) > 0 and char_length(text) <= 500),
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.private_messages enable row level security;

create policy "pm_read_own" on public.private_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "pm_insert_own" on public.private_messages for insert
  with check (auth.uid() = sender_id);


-- ---------------------------------------------------------------------------
-- users
-- Stores application-level user info: username, email, and hashed password.
-- The id mirrors auth.users so it acts as a 1-to-1 extension of Supabase Auth.
-- Passwords are hashed with pgcrypto (bcrypt). Never store plaintext passwords.
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

drop table if exists public.users cascade;
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  email       text not null,
  password_hash text not null,
  created_at  timestamptz not null default now()
);

alter table public.users enable row level security;

-- Users can only view and update their own row
create policy "users_select_own" on public.users
  for select to authenticated using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update to authenticated using (auth.uid() = id);

-- Service role (or trigger) can insert
create policy "users_insert_own" on public.users
  for insert to authenticated with check (auth.uid() = id);

comment on table public.users is
  'Application user record with hashed credentials. Mirrors auth.users 1-to-1.';

-- ---------------------------------------------------------------------------
-- Auto-populate public.users when a new auth user signs up.
-- The password_hash is populated from raw_user_meta_data if provided,
-- otherwise a sentinel placeholder is stored (OAuth users have no password).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user_extended()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, username, email, password_hash)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    coalesce(
      new.raw_user_meta_data->>'password_hash',
      'nologin_' || gen_random_uuid()::text || gen_random_uuid()::text
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_extended on auth.users;
create trigger on_auth_user_created_extended
  after insert on auth.users
  for each row execute procedure public.handle_new_user_extended();

-- ---------------------------------------------------------------------------
-- user_directory
-- The `users_select_own` policy above means a logged-in user can only see
-- their OWN row in public.users. That's correct for email/password_hash,
-- but it also blocks two things the app needs:
--   1. Sign-in by username (must look up an email before the user is
--      authenticated at all).
--   2. The chat screen's "who can I message" list (must see other users'
--      usernames while authenticated).
-- This view exposes only id + username (never email or password_hash) to
-- solve (2), and the function below solves (1) without ever exposing the
-- full users table.
-- ---------------------------------------------------------------------------
drop view if exists public.user_directory;
create view public.user_directory
with (security_invoker = false) as
select id, username from public.users;

grant select on public.user_directory to anon, authenticated;

drop function if exists public.get_email_for_username(text);
create or replace function public.get_email_for_username(lookup_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from public.users where username = lookup_username limit 1;
$$;

grant execute on function public.get_email_for_username(text) to anon, authenticated;