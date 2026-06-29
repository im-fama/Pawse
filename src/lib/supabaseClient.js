import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase env vars. Did you create a .env file from .env.example?"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Electron has no normal browser redirect flow, and we're using
    // email/password (not magic links), so we keep session persistence
    // local and skip URL-based session detection entirely.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
