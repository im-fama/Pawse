import { useState, useCallback } from "react";
import { NavigationContext } from "./NavigationContext";

export function NavigationProvider({
  children,
  initialScreen = "home",
  initialParams = {},
}) {
  const [screen, setScreen] = useState(initialScreen);
  const [params, setParams] = useState(initialParams);

  const navigate = useCallback((nextScreen, nextParams = {}) => {
    setScreen(nextScreen);
    setParams(nextParams);
  }, []);

  return (
    <NavigationContext.Provider value={{ screen, params, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}
