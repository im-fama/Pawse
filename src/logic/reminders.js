import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const REMINDER_THRESHOLDS = [3, 6, 30];

function daysBetween(startDate, endDate) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getTargetReminderStage(daysSinceLastLog) {
  if (daysSinceLastLog >= REMINDER_THRESHOLDS[2]) return 3;
  if (daysSinceLastLog >= REMINDER_THRESHOLDS[1]) return 2;
  if (daysSinceLastLog >= REMINDER_THRESHOLDS[0]) return 1;
  return 0;
}

export async function ensureReminderState(userId) {
  if (!userId || !isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from("user_reminder_state")
      .select("user_id, reminder_stage, last_reminder_sent_at, last_mood_logged_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;

    const { data: created, error: createError } = await supabase
      .from("user_reminder_state")
      .insert({
        user_id: userId,
        reminder_stage: 0,
        last_mood_logged_at: null,
        last_reminder_sent_at: null,
        updated_at: new Date().toISOString(),
      })
      .select("user_id, reminder_stage, last_reminder_sent_at, last_mood_logged_at, updated_at")
      .single();

    if (createError) throw createError;
    return created;
  } catch (err) {
    console.warn("Could not load reminder state:", err);
    return null;
  }
}

export async function resetReminderState(userId, lastLoggedAt = new Date().toISOString()) {
  if (!userId || !isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from("user_reminder_state")
      .upsert(
        {
          user_id: userId,
          reminder_stage: 0,
          last_mood_logged_at: lastLoggedAt,
          last_reminder_sent_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("user_id, reminder_stage, last_reminder_sent_at, last_mood_logged_at, updated_at")
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("Could not reset reminder state:", err);
    return null;
  }
}

export async function checkAndSendReminder(userId, email, latestMoodLogCreatedAt) {
  if (!userId || !email || !isSupabaseConfigured) {
    return { sent: false, reason: "not-configured" };
  }

  try {
    const reminderState = await ensureReminderState(userId);

    let lastLoggedAt = latestMoodLogCreatedAt;
    if (!lastLoggedAt) {
      const { data, error } = await supabase
        .from("mood_logs")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error) {
        lastLoggedAt = data?.created_at ?? null;
      }
    }

    if (!lastLoggedAt) {
      return { sent: false, reason: "no-log" };
    }

    const daysSinceLastLog = daysBetween(lastLoggedAt, new Date());
    const targetStage = getTargetReminderStage(daysSinceLastLog);

    if (!targetStage) {
      return { sent: false, reason: "not-due" };
    }

    if (reminderState?.reminder_stage >= targetStage) {
      return { sent: false, reason: "already-sent" };
    }

    const { data, error } = await supabase.functions.invoke("send-mood-reminder", {
      body: {
        to: email,
        stage: targetStage,
        lastLoggedAt,
      },
    });

    if (error) {
      console.warn("Reminder email failed:", error);
      return { sent: false, reason: "send-failed", error };
    }

    const { error: updateError } = await supabase
      .from("user_reminder_state")
      .upsert(
        {
          user_id: userId,
          reminder_stage: targetStage,
          last_mood_logged_at: lastLoggedAt,
          last_reminder_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (updateError) {
      console.warn("Could not update reminder state:", updateError);
    }

    return { sent: true, stage: targetStage, data };
  } catch (err) {
    console.warn("Reminder check failed:", err);
    return { sent: false, reason: "error", error: err };
  }
}
