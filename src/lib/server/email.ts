type EmailPayload = { to: string; name?: string; subject: string; title: string; message: string; link?: string };

const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const senderEmail = process.env.PROFY_EMAIL_FROM || process.env.BREVO_SENDER_EMAIL;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

export async function sendTransactionalEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || !senderEmail || !payload.to) {
    console.warn("Transactional email skipped: BREVO_API_KEY/PROFY_EMAIL_FROM is not configured.");
    return false;
  }

  const link = payload.link ? new URL(payload.link, appUrl).toString() : undefined;
  const htmlContent = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#11233f"><h1 style="color:#0d8d78">PROFY</h1><h2>${escapeHtml(payload.title)}</h2><p>${escapeHtml(payload.message)}</p>${link ? `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#0d8d78;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Ouvrir Profy</a></p>` : ""}<hr><small>Vous recevez cet email car une activité importante a eu lieu sur Profy.</small></div>`;

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sender: { name: "PROFY", email: senderEmail }, to: [{ email: payload.to, name: payload.name }], subject: payload.subject, htmlContent }),
    });
    if (!response.ok) console.error("Brevo transactional email failed", response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error("Brevo transactional email error", error);
    return false;
  }
}
