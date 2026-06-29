import { supabase } from "../lib/supabaseClient";

const LOGS_KEY = "pawse_mood_logs";
const STATE_KEY = "pawse_pet_state";

// Wraps a Supabase call with a timeout, since the client can hang
// indefinitely on network issues.
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Check your connection.")), ms)
    ),
  ]);
}

// Writes a mood check-in to localStorage and optionally to Supabase
export async function logMood(userId, moodId) {
  const nowIso = new Date().toISOString();

  // 1. Save to LocalStorage
  try {
    const localLogs = JSON.parse(localStorage.getItem(LOGS_KEY) || "[]");
    localLogs.unshift({
      id: String(Date.now()),
      mood: moodId,
      created_at: nowIso,
    });
    localStorage.setItem(LOGS_KEY, JSON.stringify(localLogs));

    const localState = {
      last_seen: nowIso,
      last_mood: moodId,
      streak_days_apart: 0,
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(localState));
  } catch (e) {
    console.error("Local storage write error:", e);
  }

  // 2. Try Supabase if user is authenticated and supabase client is ready
  if (userId) {
    try {
      const { error: logError } = await withTimeout(
        supabase.from("mood_logs").insert({ user_id: userId, mood: moodId })
      );
      if (logError) throw logError;

      const { error: stateError } = await withTimeout(
        supabase.from("pet_state").upsert({
          user_id: userId,
          last_seen: nowIso,
          last_mood: moodId,
          streak_days_apart: 0,
        })
      );
      if (stateError) throw stateError;
    } catch (err) {
      console.warn("Failed syncing with Supabase database (offline?):", err.message);
    }
  }

  return { mood: moodId, loggedAt: nowIso };
}

// Fetches the user's current pet_state row. Fallbacks to localStorage.
export async function fetchPetState(userId) {
  // Load from local storage
  try {
    const localState = localStorage.getItem(STATE_KEY);
    if (localState) {
      return JSON.parse(localState);
    }
  } catch (e) {
    console.error("Local storage read error:", e);
  }

  // Fallback to default state
  return {
    last_seen: null,
    last_mood: "happy",
    streak_days_apart: 0,
  };
}

// Fetches the user's mood history, most recent first.
export async function fetchMoodHistory(userId, limit = 100) {
  try {
    const localLogs = JSON.parse(localStorage.getItem(LOGS_KEY) || "[]");
    return localLogs.slice(0, limit);
  } catch (e) {
    console.error("Local storage history read error:", e);
    return [];
  }
}

// Whole-calendar-day difference between last_seen and now
export function daysSince(lastSeenIso) {
  if (!lastSeenIso) return 0;
  const last = new Date(lastSeenIso);
  const now = new Date();
  const lastDay = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
  const nowDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((nowDay - lastDay) / 86400000));
}
