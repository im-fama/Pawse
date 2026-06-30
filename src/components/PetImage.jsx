import { useEffect, useState } from "react";
import { getPetImageUrl } from "../lib/petImages";

// Renders a mood's pet image. If the file 404s (e.g. you haven't drawn
// art for this mood yet, or a typo in the filename), falls back to the
// generic placeholder instead of showing a broken-image icon.
export default function PetImage({ mood, alt, className }) {
  const [src, setSrc] = useState(() => getPetImageUrl(mood));

  // Sync src whenever the mood prop changes (e.g. carousel navigation)
  useEffect(() => {
    setSrc(getPetImageUrl(mood));
  }, [mood]);

  return (
    <img
      src={src}
      alt={alt || mood?.label || "Pawse"}
      className={className}
      onError={() => setSrc("/pet-moods/placeholder.png")}
      draggable={false}
    />
  );
}
