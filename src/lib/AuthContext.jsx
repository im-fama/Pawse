import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { AuthContext } from "./AuthContextObject";
import {
  clearSavedSession,
  getSavedAccount,
  rememberAccount,
  updateSavedSession,
} from "./savedAccounts";

// Clears this device's Supabase session WITHOUT revoking it on the server,
// so a remembered account's token keeps working for one-tap sign-in.
function clearLocalSession() {
  supabase.auth.stopAutoRefresh();
  const storageKey = supabase.auth.storageKey;
  try {
    for (const key of Object.keys(localStorage)) {
      if (storageKey ? key.startsWith(storageKey) : /^sb-.*-auth-token/.test(key)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (existingSession) {
          setSession(existingSession);
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen for auth state changes (sign in, sign out, token refresh, etc.)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase rotates refresh tokens; keep the remembered copy current.
      updateSavedSession(session);
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile whenever session changes
  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }

    let active = true;
    setProfileLoading(true);

    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, username, created_at")
          .eq("id", session.user.id)
          .maybeSingle();

        if (active) {
          if (error) {
            console.error("Error loading profile:", error.message);
          } else {
            setProfile(data);
            if (data?.username && session.user.email) {
              rememberAccount({
                id: session.user.id,
                email: session.user.email,
                username: data.username,
                refreshToken: session.refresh_token,
              });
            }
          }
        }
      } catch (err) {
        console.error("Profile load err:", err);
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [session]);

  async function refreshProfile() {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, created_at")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error("Failed to refresh profile:", err);
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  // Sign in with username — looks up the email via the get_email_for_username
  // RPC (a security-definer function), since RLS only lets a signed-in user
  // read their own row from public.users and we're not signed in yet here.
  async function signInWithUsername(username, password) {
    const trimmed = username.trim();
    if (!trimmed) throw new Error("Username is required.");

    const { data: email, error } = await supabase.rpc("get_email_for_username", {
      lookup_username: trimmed,
    });

    if (error || !email) {
      throw new Error("No account found with that username.");
    }

    return signIn(email, password);
  }

  async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim(),
        },
      },
    });
    if (error) throw error;
    return data;
  }

  // One-tap sign-in for a remembered account. Returns false when the stored
  // token no longer works, so the caller can ask for the password instead.
  async function signInWithSavedAccount(email) {
    const account = getSavedAccount(email);
    if (!account?.refreshToken) return false;

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: account.refreshToken,
    });
    if (error || !data?.session) {
      clearSavedSession(email);
      return false;
    }
    return true;
  }

  async function signOut() {
    const {
      data: { session: current },
    } = await supabase.auth.getSession();
    const email = current?.user?.email;

    // Remembered account: keep its session alive for one-tap sign-in and just
    // clear it from this device. Reload so the Supabase client starts clean.
    if (email && current.refresh_token && getSavedAccount(email)) {
      updateSavedSession(current);
      clearLocalSession();
      window.location.reload();
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading: loading || profileLoading,
    profile,
    refreshProfile,
    hasProfile: Boolean(profile),
    signIn,
    signInWithUsername,
    signInWithSavedAccount,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}