import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://pawse.app";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const payload = await req.json().catch(() => ({}));
  const { to, stage, lastLoggedAt } = payload as {
    to?: string;
    stage?: number;
    lastLoggedAt?: string;
  };

  if (!to) {
    return json(400, { error: "Missing recipient email" });
  }

  if (!RESEND_API_KEY) {
    return json(500, {
      error: "RESEND_API_KEY is not configured in Supabase Edge Functions.",
    });
  }

  const stageLabel = stage === 1 ? "3-day" : stage === 2 ? "6-day" : "30-day";
  const subject = `Pawse reminder: ${stageLabel} check-in`;
  const lastSeen = lastLoggedAt ? new Date(lastLoggedAt).toLocaleDateString() : "your last check-in";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #33241C; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">Pawse reminder</h2>
      <p>Hi there,</p>
      <p>It’s been a while since your last mood check-in. Your last one was on <strong>${lastSeen}</strong>.</p>
      <p>This is your ${stageLabel} reminder to check in with Pawse and share how you’re feeling.</p>
      <p><a href="${APP_URL}" style="display: inline-block; margin-top: 8px; padding: 10px 14px; background: #634636; color: white; text-decoration: none; border-radius: 8px;">Open Pawse</a></p>
      <p style="margin-top: 12px;">Love,<br />Pawse</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Pawse <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    return json(response.status, {
      error: "Email send failed",
      details: result,
    });
  }

  return json(200, { ok: true, result });
});
