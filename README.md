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

Fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `GROQ_API_KEY`.

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

## Web / phone app (free, via Vercel)

The same app runs in the browser and installs on phones as a PWA.

1. Push this repo to GitHub, then **Import** it at [vercel.com](https://vercel.com)
   (framework: Vite — build `npm run build`, output `dist` are picked up from `vercel.json`).
2. In **Settings → Environment Variables** add:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `GROQ_API_KEY` (server-only — **no** `VITE_` prefix, so it never reaches the browser)
   - optional: `ELECTRON_SKIP_BINARY_DOWNLOAD=1` to speed up builds
3. In Supabase **Authentication → URL Configuration**, add your Vercel URL to
   Site URL / Redirect URLs.
4. On the phone: open the link → **iPhone**: Safari → Share → *Add to Home Screen*;
   **Android**: Chrome → ⋮ → *Install app*.

On a laptop the app shows as a 397×550 window on an animated backdrop; on a phone
it fills the screen.

**AI (Kitty) calls** go through `/api/groq` (`api/groq.js` on Vercel, a Vite
middleware in dev), which only accepts logged-in Supabase users. The packaged
Electron app loads from `file://`, so build it with
`VITE_API_BASE_URL=https://your-app.vercel.app` for Kitty to work there.

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
