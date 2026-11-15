// Locally remembered accounts, so returning users can tap their account and
// sign straight back in. Each entry keeps that account's Supabase refresh
// token (the same kind of token Supabase already keeps in localStorage for the
// active session) — never the password.

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

export function getSavedAccount(email) {
  return readAll().find((account) => account.email === email) ?? null;
}

// Adds a new remembered account, or updates an existing one.
export function rememberAccount({ id, email, username, refreshToken }) {
  if (!email) return;
  const accounts = readAll();
  const index = accounts.findIndex((account) => account.email === email);
  const entry = { id: id ?? null, email, username: username ?? "" };
  if (refreshToken) entry.refreshToken = refreshToken;

  if (index >= 0) {
    accounts[index] = { ...accounts[index], ...entry };
  } else {
    accounts.push(entry);
  }
  writeAll(accounts);
}

// Keeps the stored token in step with Supabase's token rotation. Only touches
// accounts that are already remembered.
export function updateSavedSession(session) {
  const email = session?.user?.email;
  const refreshToken = session?.refresh_token;
  if (!email || !refreshToken) return;

  const accounts = readAll();
  const index = accounts.findIndex((account) => account.email === email);
  if (index < 0 || accounts[index].refreshToken === refreshToken) return;

  accounts[index] = { ...accounts[index], refreshToken };
  writeAll(accounts);
}

// Drops the stored token (e.g. it expired) but keeps the account in the list,
// so the user can sign in with their password once and it's saved again.
export function clearSavedSession(email) {
  writeAll(
    readAll().map((account) => {
      if (account.email !== email) return account;
      const rest = { ...account };
      delete rest.refreshToken;
      return rest;
    })
  );
}

// Removes the account from this device and revokes its session on Supabase
// so the stored token can't be used again.
export async function forgetAccount(email) {
  const account = getSavedAccount(email);
  writeAll(readAll().filter((entry) => entry.email !== email));
  if (account?.refreshToken) {
    await revokeRefreshToken(account.refreshToken);
  }
}

async function revokeRefreshToken(refreshToken) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !apikey) return;

  try {
    // Trade the refresh token for an access token, then end that session.
    const tokenResponse = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!tokenResponse.ok) return; // already expired/revoked — nothing to do

    const { access_token: accessToken } = await tokenResponse.json();
    await fetch(`${url}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: { apikey, Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // Offline — the account is still removed from this device.
  }
}
