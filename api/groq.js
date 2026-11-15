// Vercel serverless function: POST /api/groq
import { handleGroqRequest, CORS_HEADERS } from "../server/groqProxy.js";

export default async function handler(req, res) {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }

  const { status, data } = await handleGroqRequest({
    authHeader: req.headers.authorization,
    body,
  });
  res.status(status).json(data);
}
