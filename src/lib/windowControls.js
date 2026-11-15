// True inside the Electron desktop app (preload exposes electronAPI).
export const isElectron = typeof window !== "undefined" && Boolean(window.electronAPI);

export function closeWindow() {
  window.electronAPI?.close();
}

export function onCloseMouseDown(event) {
  event.preventDefault();
  event.stopPropagation();
  window.electronAPI?.close();
}
