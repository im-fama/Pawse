import { BIRTHDAY } from "../data/birthday";

const SEEN_KEY = "pawse_birthday_seen";

export function shouldShowBirthday() {
  if (!BIRTHDAY.enabled) return false;
  try {
    return localStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return false;
  }
}

export function markBirthdaySeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // ignore (private browsing)
  }
}
