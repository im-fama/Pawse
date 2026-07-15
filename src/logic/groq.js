const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

export async function sendChatMessage(history, message, todayMood, apiKey) {
  const keyToUse = apiKey || import.meta.env.VITE_GROQ_API_KEY;
  if (!keyToUse) {
    throw new Error("Missing Groq API key. Please add it in settings or the .env file.");
  }

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

  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${keyToUse}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_GROQ_MODEL || DEFAULT_GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...previousMessages,
        { role: "user", content: message },
      ],
      max_completion_tokens: 220,
      temperature: 0.75,
    }),
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
      throw new Error("Groq rejected this API key. Please check it or add a new key.");
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

export async function generateSupportMessage(moodLabel, apiKey) {
  const keyToUse = apiKey || import.meta.env.VITE_GROQ_API_KEY;
  if (!keyToUse) {
    throw new Error("Missing Groq API key.");
  }

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

  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${keyToUse}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_GROQ_MODEL || DEFAULT_GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 65,
      temperature: 0.75,
    }),
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
