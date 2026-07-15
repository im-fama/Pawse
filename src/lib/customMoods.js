// Per-user, local-only storage for custom moods. Not synced to Supabase.

const STORAGE_PREFIX = "pawse_custom_moods_";

export const CUSTOM_MOOD_NAME_LIMIT = 20;
export const CUSTOM_MOOD_DESCRIPTION_LIMIT = 150; // fits the fixed description box

function storageKey(userId) {
    return `${STORAGE_PREFIX}${userId}`;
}

export function getCustomMoods(userId) {
    if (!userId) return [];
    try {
        return JSON.parse(localStorage.getItem(storageKey(userId)) || "[]");
    } catch (e) {
        console.error("Failed to read custom moods:", e);
        return [];
    }
}

export function saveCustomMood(userId, mood) {
    if (!userId) throw new Error("You must be signed in to create a mood.");
    const updated = [...getCustomMoods(userId), mood];
    localStorage.setItem(storageKey(userId), JSON.stringify(updated));
    return updated;
}

export function deleteCustomMood(userId, moodId) {
    if (!userId) return [];
    const updated = getCustomMoods(userId).filter((m) => m.id !== moodId);
    localStorage.setItem(storageKey(userId), JSON.stringify(updated));
    return updated;
}

export function updateCustomMood(userId, moodId, patch) {
    if (!userId) return [];
    const updated = getCustomMoods(userId).map((m) =>
        m.id === moodId ? { ...m, ...patch } : m
    );
    localStorage.setItem(storageKey(userId), JSON.stringify(updated));
    return updated;
}

// Resizes an uploaded image file down to a small base64 PNG so it's
// cheap to store in localStorage. maxDimension is in pixels.
export function resizeImageFile(file, maxDimension = 200) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith("image/")) {
            reject(new Error("Please choose an image file."));
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Couldn't read that file."));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error("Couldn't read that image."));
            img.onload = () => {
                const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/png"));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}