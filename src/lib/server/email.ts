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
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#11233f;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;padding:32px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:24px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 12px rgba(17,35,63,0.04);">
                <tr>
                  <td style="padding:32px 32px 24px 32px;border-bottom:1px solid #f1f5f9;">
                    <div style="display:inline-block;font-size:24px;font-weight:bold;color:#11233f;letter-spacing:-0.5px;">
                      ProfySpace<span style="display:inline-block;background-color:#0d8d78;color:#ffffff;font-size:12px;font-weight:800;padding:2px 6px;border-radius:6px;margin-left:4px;vertical-align:middle;">.tn</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:bold;color:#11233f;line-height:1.4;">
                      ${escapeHtml(payload.title)}
                    </h1>
                    <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#475569;">
                      ${escapeHtml(payload.message)}
                    </p>
                    ${link ? `
                      <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 12px 0;">
                        <tr>
                          <td style="border-radius:16px;background-color:#0d8d78;">
                            <a href="${escapeHtml(link)}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:16px;">
                              Accéder à mon espace →
                            </a>
                          </td>
                        </tr>
                      </table>
                    ` : ""}
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px 28px 32px;background-color:#f8fafc;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;line-height:1.5;">
                    Vous recevez cet e-mail transactionnel de notification pour votre compte sur ProfySpace.tn.<br>
                    Pour toute question, contactez notre équipe sur contact@profyspace.tn.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

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
