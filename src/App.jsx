import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import HomeScreen from "./screens/HomeScreen";
import MoodCarouselScreen from "./screens/MoodCarouselScreen";
import MessageScreen from "./screens/MessageScreen";
import MoodLogScreen from "./screens/MoodLogScreen";
import { fetchPetState, daysSince } from "./logic/petState";

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
  const [petState, setPetState] = useState(null);
  const [stateLoading, setStateLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setStateLoading(true);

    fetchPetState(null)
      .then((state) => {
        if (!cancelled) {
          setPetState(state);
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
  }, [location.pathname]);

  if (stateLoading) {
    return (
      <div className="app-loading">
        <p>Loading your pet...</p>
      </div>
    );
  }

  const daysApart = daysSince(petState?.last_seen);

  return (
    <Routes>
      <Route
        path="/home"
        element={<HomeScreen lastMood={petState?.last_mood} />}
      />
      <Route
        path="/carousel"
        element={<MoodCarouselScreen daysApart={daysApart} />}
      />
      <Route path="/message/:moodId" element={<MessageScreen />} />
      <Route path="/mood-log" element={<MoodLogScreen />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
