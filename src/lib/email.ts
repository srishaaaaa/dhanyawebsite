import "server-only";

// Transactional email via Resend's REST API when RESEND_API_KEY + EMAIL_FROM are set.
// Without them, emails are skipped (logged in development) and the app keeps working.
export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") console.info(`[email skipped — not configured] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(10_000),
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html }),
    });
    if (!res.ok) console.error("email failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("email error", e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#F8F3EB;font-family:Georgia,serif;color:#211D20">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
  <tr><td style="background:#30042E;color:#F8F3EB;text-align:center;padding:28px;letter-spacing:.35em;font-size:22px">DHANYA</td></tr>
  <tr><td style="padding:32px 32px 8px"><h1 style="font-weight:400;font-size:26px;margin:0 0 16px;color:#30042E">${esc(title)}</h1>
  <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${body}</div></td></tr>
  <tr><td style="padding:24px 32px 32px;font-family:Arial,sans-serif;font-size:12px;color:#777">DHANYA BOUTIQUE</td></tr>
  </table></td></tr></table></body></html>`;
}
export { esc };
