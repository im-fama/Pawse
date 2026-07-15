// Locally remembered accounts, so returning users can pick their account
// and just type a password instead of re-typing email + username every time.
// Only email + username are stored — never the password.

const STORAGE_KEY = "pawse_saved_accounts";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(accounts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // localStorage unavailable (private browsing, etc.) — nothing we can do.
  }
}

export function getSavedAccounts() {
  return readAll();
}

// Adds a new remembered account, or updates the username on an existing one.
export function rememberAccount({ id, email, username }) {
  if (!email) return;
  const accounts = readAll();
  const index = accounts.findIndex((account) => account.email === email);
  const entry = { id: id ?? null, email, username: username ?? "" };

  if (index >= 0) {
    accounts[index] = { ...accounts[index], ...entry };
  } else {
    accounts.push(entry);
  }
  writeAll(accounts);
}

export function removeSavedAccount(email) {
  writeAll(readAll().filter((account) => account.email !== email));
}