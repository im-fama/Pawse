import { supabase } from "../lib/supabaseClient";

// All Groq calls go through our own /api/groq endpoint (Vercel function in
// production, Vite middleware in dev) so the Groq key never reaches the browser.
// The packaged Electron app loads from file://, so it needs VITE_API_BASE_URL
// pointing at the deployed site (e.g. https://pawse.vercel.app).
function getApiBase() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (window.location.protocol.startsWith("http")) return "";
  return null;
}

async function callGroq(payload) {
  const apiBase = getApiBase();
  if (apiBase === null) {
    throw new Error("Kitty isn't connected yet. Set VITE_API_BASE_URL to your deployed site.");
  }

  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) {
    throw new Error("Please log in again to talk to Kitty.");
  }

  return fetch(`${apiBase}/api/groq`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function sendChatMessage(history, message, todayMood) {

  let systemPrompt =
    "You are Kitty, a calm and empathetic companion inside a mood-tracking app called Pawse. Your role is similar to a supportive therapist or counsellor: you listen without judgment, ask thoughtful follow-up questions, and help the user reflect on their feelings. Speak in a warm, grounded, conversational tone. Keep responses concise, usually 2 to 4 sentences. You are caring but composed. have fun talking to the user and be funny";
  if (todayMood) {
    systemPrompt += ` The user logged their mood as "${todayMood}" today. Acknowledge this gently if relevant, and guide the conversation toward understanding what's driving that feeling.`;
  }

  const previousMessages = history
    .filter((msg) => msg.text?.trim())
    .map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text,
    }));

  const response = await callGroq({
    messages: [
      { role: "system", content: systemPrompt },
      ...previousMessages,
      { role: "user", content: message },
    ],
    max_completion_tokens: 220,
    temperature: 0.75,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const rawMessage = errorData?.error?.message || "";
    const lowerMessage = rawMessage.toLowerCase();

    if (
      response.status === 401 ||
      lowerMessage.includes("invalid api key") ||
      lowerMessage.includes("unauthorized")
    ) {
      throw new Error(rawMessage || "Kitty couldn't connect. Check GROQ_API_KEY on the server.");
    }

    if (
      response.status === 429 ||
      lowerMessage.includes("quota") ||
      lowerMessage.includes("rate")
    ) {
      throw new Error("Groq rate limit reached. Please wait a little and try again.");
    }

    throw new Error(rawMessage || `Groq API error ${response.status}`);
  }

  const result = await response.json();
  const replyText = result?.choices?.[0]?.message?.content;
  if (!replyText) {
    throw new Error("Empty response received from Groq.");
  }

  return replyText.trim();
}

export async function generateSupportMessage(moodLabel) {

  const prompt = `You are a compassionate and supportive assistant.

The user will provide their current mood (e.g., sad, anxious, happy, tired, lonely, stressed).

Your task is to generate a short, comforting message tailored to that mood.

Guidelines:
- Be empathetic, warm, and human-like (not robotic)
- Keep it extremely short (strictly 1 to 2 short sentences, maximum 25-30 words total)
- Do NOT give clinical or medical advice
- Do NOT sound overly generic
- Use gentle encouragement when appropriate
- Match the tone to the mood (e.g., softer for sadness, uplifting for stress)

Mood: ${moodLabel}

Support Message:`;

  const response = await callGroq({
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 65,
    temperature: 0.75,
  });

  if (!response.ok) {
    throw new Error(`Groq API error ${response.status}`);
  }

  const result = await response.json();
  const replyText = result?.choices?.[0]?.message?.content;
  if (!replyText) {
    throw new Error("Empty response received from Groq.");
  }

  return replyText.trim();
}
