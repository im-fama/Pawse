import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import AuthScreen from "./screens/AuthScreen";
import HomeScreen from "./screens/HomeScreen";
import MoodCarouselScreen from "./screens/MoodCarouselScreen";
import MessageScreen from "./screens/MessageScreen";
import MoodLogScreen from "./screens/MoodLogScreen";
import { fetchLatestMoodLog, daysSince } from "./logic/moodLogs";
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
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [latestMoodLog, setLatestMoodLog] = useState(null);
  const [stateLoading, setStateLoading] = useState(true);

  useEffect(() => {
    // Reset when there's no user
    if (authLoading || !userId) {
      setStateLoading(false);
      return;
    }

    let cancelled = false;
    setStateLoading(true);

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

  // Waiting for Supabase session to initialise
  if (authLoading) {
    return (
      <div className="app-loading">
        <p>🐾</p>
      </div>
    );
  }

  // Not logged in → show Auth screen
  if (!user) {
    return <AuthScreen />;
  }

  // Logged in but waiting for mood data
  if (stateLoading) {
    return (
      <div className="app-loading">
        <p>🐾</p>
      </div>
    );
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
        <Route path="/message/:moodId" element={<MessageScreen />} />
        <Route path="/mood-log" element={<MoodLogScreen userId={userId} />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
}
