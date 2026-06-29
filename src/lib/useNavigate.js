import { useContext } from "react";
import { NavigationContext } from "./NavigationContext";

function useNavContext() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("Navigation hooks must be used within a NavigationProvider");
  }
  return ctx;
}

// Returns just the navigate(screen, params) function - the common case
// for buttons that move to another screen.
export function useNavigate() {
  return useNavContext().navigate;
}

// Returns the current screen name and its params - used by the root
// App component to decide what to render, and by screens that need to
// read a param (e.g. MessageScreen reading which mood was picked).
export function useCurrentScreen() {
  const { screen, params } = useNavContext();
  return { screen, params };
}
