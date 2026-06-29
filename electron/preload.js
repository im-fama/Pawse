// Preload script runs in an isolated context with access to Node + the renderer.
// We don't need to expose any Node APIs to the renderer yet since Supabase
// auth/data calls happen entirely over HTTPS from the renderer itself.
// Kept here as a placeholder for future native features (e.g. tray icon,
// notifications, auto-launch on login).

window.addEventListener("DOMContentLoaded", () => {
  // no-op for now
});
