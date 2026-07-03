import { createContext } from "react";

// Pawse has a small, fixed set of screens (home, carousel, message,
// moodLog) and runs in an Electron window with no URL bar - a full
// router is unnecessary weight. This context just tracks "which screen
// is active" plus optional params for the current screen.
export const NavigationContext = createContext(null);
