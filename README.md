# Pawse 🐾

A cozy desktop companion — log how you're feeling, get a supportive message,
and look back through your mood history.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. **Settings → API** — copy Project URL and anon key
3. **SQL Editor** — run the full `supabase/schema.sql`
4. **Authentication → Providers → Email** — turn off "Confirm email" for
   easier local testing (turn back on before shipping)

### 2. Environment

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### 3. Run

```bash
npm install
npm run electron:dev
```

## How it works

- **Sign up / log in** with email and password (Supabase Auth)
- Each user only sees **their own** mood logs (row-level security)
- Pick a mood in the carousel → saved to `mood_logs` with your `user_id`
- Mood history screen reads from the same table

## Building installers

```bash
npm run electron:build:mac
npm run electron:build:win
```

## If mood logs aren't saving

1. Re-run `supabase/schema.sql` (it recreates `mood_logs` with `user_id`)
2. Confirm `.env` has the correct Supabase URL and anon key
3. Make sure you're **logged in** — inserts require an authenticated session
4. Check the browser/Electron console for Supabase errors
