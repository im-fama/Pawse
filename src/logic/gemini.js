export async function sendChatMessage(history, message, todayMood, apiKey) {
  const keyToUse = apiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!keyToUse) {
    throw new Error("Missing Gemini API Key. Please add it in settings or the .env file.");
  }

  // Format the system instruction
  let systemPrompt = "You are Kitty, a calm and empathetic companion inside a mood-tracking app called Pawse. Your role is similar to a supportive therapist or counsellor — you listen without judgment, ask thoughtful follow-up questions, and help the user reflect on their feelings. Speak in a warm, grounded, and conversational tone. Keep responses concise (2–4 sentences). You are caring but composed.";
  if (todayMood) {
    systemPrompt += ` The user logged their mood as "${todayMood}" today. Acknowledge this gently if relevant, and guide the conversation toward understanding what's driving that feeling.`;
  }

  // Format history for Gemini API
  // history is expected to be an array of: { sender: "user" | "kitty", text: string }
  const formattedContents = history.map(msg => ({
    role: msg.sender === "user" ? "user" : "model",
    parts: [{ text: msg.text }]
  }));

  // Append new user message
  formattedContents.push({
    role: "user",
    parts: [{ text: message }]
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${keyToUse}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: formattedContents,
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const rawMessage = errorData?.error?.message || "";
    // Surface a friendly rate-limit message instead of the raw API error
    if (response.status === 429 || rawMessage.toLowerCase().includes("quota") || rawMessage.toLowerCase().includes("rate")) {
      throw new Error("You're sending messages a bit fast. Please wait a few seconds and try again.");
    }
    const errorMessage = rawMessage || `HTTP error ${response.status}`;
    throw new Error(`Gemini API Error: ${errorMessage}`);
  }

  const result = await response.json();
  const replyText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!replyText) {
    throw new Error("Empty response received from Gemini.");
  }

  return replyText.trim();
}
