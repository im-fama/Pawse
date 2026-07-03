// Resolves the public URL for a mood's pet image. Falls back to a
// generic placeholder if no `image` is set on the mood entry, so a
// missing asset never breaks the UI - it just looks generic until you
// drop in real art at public/pet-moods/<image>.

export function getPetImageUrl(mood) {
  const filename = mood?.image || "placeholder.png";
  // Vite serves everything in /public from the app root.
  return `/pet-moods/${filename}`;
}
