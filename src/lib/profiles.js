import { supabase, isSupabaseConfigured } from "./supabaseClient";

export async function getMyProfile(userId) {
  if (!userId || !isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
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

export async function createProfile(userId, username) {
  if (!userId || !username || !isSupabaseConfigured) {
    throw new Error("Missing parameters or Supabase not configured");
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, username: username.trim() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function searchUsers(query, excludeUserId) {
  if (!isSupabaseConfigured) return [];
  try {
    let builder = supabase
      .from("profiles")
      .select("id, username");

    if (query) {
      builder = builder.ilike("username", `%${query}%`);
    }
    if (excludeUserId) {
      builder = builder.neq("id", excludeUserId);
    }

    const { data, error } = await builder.limit(20);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error searching profiles:", err.message);
    return [];
  }
}

export async function getAllUsers(excludeUserId) {
  if (!isSupabaseConfigured) return [];
  try {
    let builder = supabase
      .from("profiles")
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
