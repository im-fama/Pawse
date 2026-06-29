# Pawse 🐾

A cozy desktop pet companion — log how you're feeling, kitty reacts with
a personalized message, and you can look back through your mood history
any time.

## Status: Core flow working ✅

What's working right now:
- Electron + React (Vite) app shell
- Email/password signup & login via Supabase Auth, session persists across restarts
- Cross-device ready: your account lives in Supabase, not on one machine
- **Homepage** — greets you with kitty's last mood, Start button
- **Mood carousel** — arrow through 20 moods, tap kitty to log one
- **Message screen** — personalized cheer-up message + pet image for the mood you picked
- **Mood log** — grid of your check-in history, newest first
- All Supabase calls have a 10s timeout, so a flaky connection shows a
  clear error instead of an infinite loading spinner

What's a placeholder:
- All 20 pet mood images in `public/pet-moods/` are simple generated
  stand-ins (cream/brown cat faces), not your real Pawse art. Drop your
  own art in as same-named files and the app picks them up automatically
  — see "Adding your own pet art" below.
- No animation yet — pet images are static per mood.

---

## 1. Set up your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account + new project.
2. Once it's created, go to **Settings → API** and copy:
   - **Project URL**
   - **anon public** key
3. Go to **SQL Editor → New query**, paste the contents of `supabase/schema.sql`,
   and run it. This creates the `mood_logs` and `pet_state` tables with
   row-level security so each user can only see their own data.
4. (Optional, recommended for faster local testing) Go to
   **Authentication → Providers → Email** and turn **off** "Confirm email" —
   otherwise every signup requires clicking a confirmation link before you
   can log in. Turn it back on before you ship to real users.

## 2. Configure the app

```bash
cp .env.example .env
```

Open `.env` and fill in your Project URL and anon key from step 1.

## 3. Install dependencies

```bash
npm install
```

## 4. Run it

```bash
npm run electron:dev
```

This starts the Vite dev server and opens the Electron window once it's
ready. Hot reload works for the renderer (React) side.

If you just want to check the UI in a regular browser tab without Electron:

```bash
npm run dev
```

## Adding your own pet art

Every mood is defined in `src/data/moods.js` with an `image` filename.
To replace the placeholder for a mood, just drop a PNG with the same
filename into `public/pet-moods/`, e.g. `public/pet-moods/happy.png`.
No code changes needed — `PetImage` resolves the file by name and falls
back to `placeholder.png` automatically if a file is ever missing.

Recommended size: square, at least 300×300px, transparent background.

## Adding or editing moods

`src/data/moods.js` is the single source of truth for every mood: its
`id` (stored in Supabase), `label` (shown in the UI), `image` (filename
in `public/pet-moods/`), and `message` (the cat's personalized cheer-up
line). Add a new entry to the `MOODS` array and it automatically shows
up in the carousel, message screen, and mood log — no other code
changes required.

## Building installers (later)

```bash
npm run electron:build:mac   # macOS .dmg
npm run electron:build:win   # Windows .exe (nsis installer)
```

---

## Project structure

```
electron/
  main.js        Electron main process — creates the window
  preload.js     Preload script (placeholder for now)
src/
  components/
    PawseWindow.jsx     Shared window chrome (titlebar + content area)
    PetImage.jsx        Pet image with placeholder fallback on load error
  data/
    moods.js             Single source of truth: every mood's id/label/image/message
  lib/
    supabaseClient.js     Supabase client setup
    AuthContextObject.js  The auth React context (isolated for fast refresh)
    AuthContext.jsx       AuthProvider — tracks session, exposes signOut
    useAuth.js             Hook to consume auth state in any component
    NavigationContext.js / NavigationProvider.jsx / useNavigate.js
                           Lightweight in-app screen routing (no router lib needed)
    petImages.js           Resolves a mood's image URL with fallback
  logic/
    petState.js           logMood, fetchPetState, fetchMoodHistory, daysSince
  screens/
    AuthScreen.jsx              Login / signup
    HomeScreen.jsx               Greeting + Start button
    MoodCarouselScreen.jsx       Arrow through moods, tap to log
    MessageScreen.jsx            Personalized cheer-up message
    MoodLogScreen.jsx            Mood history grid
  App.jsx          Auth gate + screen routing
  main.jsx         React entry point
public/
  pet-moods/       Pet images per mood (placeholders - swap in your own art)
scripts/
  generate_placeholder_moods.py   Regenerates the placeholder mood images
supabase/
  schema.sql       SQL to run in Supabase's SQL editor
```
