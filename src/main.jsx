import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./lib/AuthContext";
import { isElectron } from "./lib/windowControls";
import "./styles/index.css";
import "./styles/web.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// Service worker makes the site installable ("Add to Home Screen") and
// loads instantly offline. Web production builds only.
if (
  import.meta.env.PROD &&
  !isElectron &&
  "serviceWorker" in navigator &&
  window.location.protocol.startsWith("http")
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("Service worker registration failed", err);
    });
  });
}
