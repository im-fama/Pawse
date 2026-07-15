import { supabase, isSupabaseConfigured } from "./supabaseClient";

// NOTE: schema.sql stores app users in public.users (not public.profiles —
// that table was dropped). These helpers were updated to match.

export async function getMyProfile(userId) {
  if (!userId || !isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error fetching own profile:", err.message);
    return null;
  }
}

// Sets/updates the username for the current user. A public.users row
// already exists by the time this runs (created automatically by the
// on_auth_user_created_extended trigger on signup), so this is an update,
// not an insert.
export async function setUsername(userId, username) {
  if (!userId || !username || !isSupabaseConfigured) {
    throw new Error("Missing parameters or Supabase not configured");
  }

  const { data, error } = await supabase
    .from("users")
    .update({ username: username.trim() })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Only id + username — backed by the public.user_directory view, which is
// the one place other users' usernames are visible (email/password stay
// locked to each user's own row).
export async function getAllUsers(excludeUserId) {
  if (!isSupabaseConfigured) return [];
  try {
    let builder = supabase
      .from("user_directory")
      .select("id, username")
      .order("username", { ascending: true });

    if (excludeUserId) {
      builder = builder.neq("id", excludeUserId);
    }

    const { data, error } = await builder;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching all users:", err.message);
    return [];
  }
}