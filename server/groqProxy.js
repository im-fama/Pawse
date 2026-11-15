import process from "node:process";

// Server-side Groq proxy so the API key never ships to the browser.
// Used by the Vercel function (api/groq.js) and the Vite dev middleware.

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const MAX_MESSAGES = 40;
const MAX_CONTENT_LENGTH = 4000;
const MAX_COMPLETION_TOKENS = 300;
const ALLOWED_ROLES = new Set(["system", "user", "assistant"]);

function fail(status, message) {
  return { status, data: { error: { message } } };
}

// Only logged-in Pawse users may spend the Groq quota.
async function isValidSupabaseUser(authHeader, env) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey || !authHeader?.startsWith("Bearer ")) {
    return false;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authHeader },
    });
    return response.ok;
  } catch {
    return false;
  }
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return null;
  }

  const cleaned = [];
  for (const msg of messages) {
    if (!msg || !ALLOWED_ROLES.has(msg.role) || typeof msg.content !== "string") {
      return null;
    }
    cleaned.push({ role: msg.role, content: msg.content.slice(0, MAX_CONTENT_LENGTH) });
  }
  return cleaned;
}

export async function handleGroqRequest({ authHeader, body, env = process.env }) {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    return fail(500, "Server is missing GROQ_API_KEY.");
  }

  if (!(await isValidSupabaseUser(authHeader, env))) {
    return fail(401, "Please log in again to talk to Kitty.");
  }

  const messages = sanitizeMessages(body?.messages);
  if (!messages) {
    return fail(400, "Invalid messages.");
  }

  const maxTokens = Math.min(
    Math.max(Number(body?.max_completion_tokens) || 200, 1),
    MAX_COMPLETION_TOKENS
  );
  const temperature = Math.min(Math.max(Number(body?.temperature) || 0.75, 0), 1.5);

  try {
    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
        messages,
        max_completion_tokens: maxTokens,
        temperature,
      }),
    });

    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch {
    return fail(502, "Could not reach Groq.");
  }
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};
