import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { AuthContext } from "./AuthContextObject";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (existingSession) {
          try {
            await supabase.auth.signOut({ scope: "global" });
          } catch (signOutError) {
            console.warn("Failed to clear existing session:", signOutError);
          }
        }

        if (mounted) {
          setSession(null);
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

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    // Return data so the caller can check if a session was immediately created
    // (happens when email confirmation is disabled in Supabase)
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
