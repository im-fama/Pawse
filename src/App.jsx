import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import AuthScreen from "./screens/AuthScreen";
import HomeScreen from "./screens/HomeScreen";
import MoodCarouselScreen from "./screens/MoodCarouselScreen";
import MessageScreen from "./screens/MessageScreen";
import MoodLogScreen from "./screens/MoodLogScreen";
import ChatScreen from "./screens/ChatScreen";
import { fetchLatestMoodLog, daysSince } from "./logic/moodLogs";
import { checkAndSendReminder } from "./logic/reminders";
import { useAuth } from "./lib/useAuth";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/*" element={<PawseRouter />} />
      </Routes>
    </HashRouter>
  );
}

function PawseRouter() {
  const location = useLocation();
  const { user, loading: authLoading, hasProfile } = useAuth();
  const userId = user?.id ?? null;
  const [latestMoodLog, setLatestMoodLog] = useState(null);
  const [stateLoading, setStateLoading] = useState(true);
  
  useEffect(() => {
    // Reset when there's no user
    if (authLoading || !userId) {
      setTimeout(() => {
        setStateLoading(false);
      }, 0);
      return;
    }

    let cancelled = false;
    setTimeout(() => {
      setStateLoading(true);
    }, 0);

    fetchLatestMoodLog(userId)
      .then((log) => {
        if (!cancelled) {
          setLatestMoodLog(log);
          setStateLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStateLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, userId, authLoading]);

  useEffect(() => {
    if (authLoading || !userId || !user?.email) return;

    if (!latestMoodLog?.created_at && stateLoading) return;

    let cancelled = false;

    checkAndSendReminder(userId, user.email, latestMoodLog?.created_at)
      .then((result) => {
        if (!cancelled) {
          if (result.sent) {
            console.info("Reminder email queued", result.stage);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("Reminder check failed", err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, latestMoodLog?.created_at, stateLoading, user?.email, userId]);

  // Waiting for Supabase session to initialise
  if (authLoading) {
    return (
      <div className="app-loading">
        <img src="/icons/paw.png" alt="Loading" className="app-loading-icon" />
      </div>
    );
  }

 // Not logged in, or logged in but profile is missing (e.g. after
  // Google OAuth signup) → AuthScreen handles both cases itself.
  if (!user || !hasProfile) {
    return <AuthScreen />;
  }

  // Logged in but waiting for mood data
  if (stateLoading) {
    return (
      <div className="app-loading">
        <img src="/icons/paw.png" alt="Loading" className="app-loading-icon" />
      </div>
    );
  }

  // Redirect the root path to home for logged-in users.
  if (location.pathname === "/" || location.pathname === "") {
    return <Navigate to="/home" replace />;
  }

  const daysApart = daysSince(latestMoodLog?.created_at);

  return (
    <div className="app-screen">
      <Routes>
        <Route path="/home" element={<HomeScreen daysApart={daysApart} />} />
        <Route
          path="/carousel"
          element={
            <MoodCarouselScreen
              daysApart={daysApart}
              userId={userId}
              onMoodLogged={() =>
                fetchLatestMoodLog(userId).then(setLatestMoodLog)
              }
            />
          }
        />
        <Route path="/message/:moodId" element={<MessageScreen userId={userId} />} />
        <Route path="/mood-log" element={<MoodLogScreen userId={userId} />} />
        <Route path="/chat" element={<ChatScreen userId={userId} />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
}
