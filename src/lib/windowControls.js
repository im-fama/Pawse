export function closeWindow() {
  window.electronAPI?.close();
}

export function onCloseMouseDown(event) {
  event.preventDefault();
  event.stopPropagation();
  window.electronAPI?.close();
}
