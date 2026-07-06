import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { resetReminderState } from "./reminders";

function logsKey(userId) {
  return `pawse_mood_logs_${userId}`;
}

function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Check your connection.")), ms)
    ),
  ]);
}

function readLocalLogs(userId) {
  if (!userId) return [];
  try {
    return JSON.parse(localStorage.getItem(logsKey(userId)) || "[]");
  } catch (e) {
    console.error("Local storage read error:", e);
    return [];
  }
}

function writeLocalLogs(userId, logs) {
  if (!userId) return;
  localStorage.setItem(logsKey(userId), JSON.stringify(logs));
}

function cacheLogAtFront(userId, log) {
  const localLogs = readLocalLogs(userId);
  const withoutDuplicate = localLogs.filter((entry) => entry.id !== log.id);
  withoutDuplicate.unshift(log);
  writeLocalLogs(userId, withoutDuplicate);
}

function updateLocalLog(userId, logId, updates) {
  if (!userId || !logId) return null;

  const localLogs = readLocalLogs(userId);
  const logIndex = localLogs.findIndex((entry) => entry.id === logId);
  if (logIndex === -1) return null;

  const updatedLog = { ...localLogs[logIndex], ...updates };
  localLogs[logIndex] = updatedLog;
  writeLocalLogs(userId, localLogs);
  return updatedLog;
}

// Saves a mood check-in for the signed-in user.
export async function logMood(userId, moodId) {
  if (!userId) {
    throw new Error("You must be signed in to log a mood.");
  }

  const fallbackLog = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    mood: moodId,
    note: null,
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured) {
    cacheLogAtFront(userId, fallbackLog);
    return fallbackLog;
  }

  try {
    const { data, error } = await withTimeout(
      supabase
        .from("mood_logs")
        .insert({ user_id: userId, mood: moodId })
        .select("id, mood, note, created_at")
        .single()
    );

    if (error) throw error;
    if (!data) throw new Error("No data returned after saving mood.");

    try {
      cacheLogAtFront(userId, data);
    } catch (e) {
      console.error("Local storage write error:", e);
    }

    try {
      await resetReminderState(userId, data.created_at ?? new Date().toISOString());
    } catch (e) {
      console.warn("Reminder reset failed:", e);
    }

    return data;
  } catch (err) {
    console.warn("Falling back to local mood log storage:", err);
    try {
      cacheLogAtFront(userId, fallbackLog);
    } catch (e) {
      console.error("Local storage write error:", e);
    }

    try {
      await resetReminderState(userId, fallbackLog.created_at);
    } catch (e) {
      console.warn("Reminder reset failed:", e);
    }

    return fallbackLog;
  }
}

export async function fetchLatestMoodLog(userId) {
  if (!userId) return null;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("mood_logs")
          .select("id, mood, note, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      );
      if (error) throw error;
      if (data) return data;
    } catch (err) {
      console.warn("Failed loading latest mood from Supabase:", err.message);
    }
  }

  const localLogs = readLocalLogs(userId);
  return localLogs[0] ?? null;
}

export async function fetchMoodLogById(logId, userId) {
  if (!logId) return null;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("mood_logs")
          .select("id, user_id, mood, note, created_at")
          .eq("id", logId)
          .maybeSingle()
      );
      if (error) throw error;
      if (data) {
        if (userId) {
          try {
            cacheLogAtFront(userId, data);
          } catch (e) {
            console.error("Local storage write error:", e);
          }
        }
        return data;
      }
    } catch (err) {
      console.warn("Failed loading mood log by id from Supabase:", err.message);
    }
  }

  const localLogs = readLocalLogs(userId);
  return localLogs.find((entry) => entry.id === logId) ?? null;
}

export async function updateMoodLogNote(logId, note, userId) {
  if (!logId) {
    throw new Error("Missing mood log identifier.");
  }

  if (!isSupabaseConfigured) {
    const updatedLog = updateLocalLog(userId, logId, { note });
    if (updatedLog) return updatedLog;
    throw new Error("Supabase is not configured.");
  }

  try {
    const { data, error } = await withTimeout(
      supabase
        .from("mood_logs")
        .update({ note })
        .eq("id", logId)
        .select("id, user_id, mood, note, created_at")
        .single()
    );

    if (error) throw error;
    if (!data) throw new Error("No data returned after updating note.");

    try {
      cacheLogAtFront(data.user_id, data);
    } catch (e) {
      console.error("Local storage write error:", e);
    }

    return data;
  } catch (err) {
    console.warn("Falling back to local note update:", err);
    const updatedLog = updateLocalLog(userId, logId, { note });
    if (updatedLog) return updatedLog;
    throw err;
  }
}

export async function deleteMoodLogNote(logId, userId) {
  if (!logId) {
    throw new Error("Missing mood log identifier.");
  }

  if (!isSupabaseConfigured) {
    const updatedLog = updateLocalLog(userId, logId, { note: null });
    if (updatedLog) return updatedLog;
    throw new Error("Supabase is not configured.");
  }

  try {
    const { data, error } = await withTimeout(
      supabase
        .from("mood_logs")
        .update({ note: null })
        .eq("id", logId)
        .select("id, user_id, mood, note, created_at")
        .single()
    );

    if (error) throw error;
    if (!data) throw new Error("No data returned after deleting note.");

    try {
      cacheLogAtFront(userId ?? data.user_id, data);
    } catch (e) {
      console.error("Local storage write error:", e);
    }

    return data;
  } catch (err) {
    console.warn("Falling back to local note deletion:", err);
    const updatedLog = updateLocalLog(userId, logId, { note: null });
    if (updatedLog) return updatedLog;
    throw err;
  }
}

export async function fetchMoodHistory(userId, limit = 100) {
  if (!userId) return [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("mood_logs")
          .select("id, mood, note, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit)
      );
      if (error) throw error;
      if (data) {
        writeLocalLogs(userId, data);
        return data;
      }
    } catch (err) {
      console.warn("Failed loading mood history from Supabase:", err.message);
    }
  }

  return readLocalLogs(userId).slice(0, limit);
}

export function daysSince(lastLoggedAt) {
  if (!lastLoggedAt) return 0;
  const last = new Date(lastLoggedAt);
  const now = new Date();
  const lastDay = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
  const nowDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((nowDay - lastDay) / 86400000));
}
