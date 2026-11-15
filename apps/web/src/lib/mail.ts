// path: apps/web/src/lib/mail.ts
// purpose: Sends the license key email through Resend.
import { Resend } from 'resend';
import { env } from './env';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export async function sendLicenseEmail(to: string, key: string): Promise<void> {
  const { RESEND_API_KEY, MAIL_FROM, NEXT_PUBLIC_SITE_URL } = env();
  const download = `${NEXT_PUBLIC_SITE_URL}/#download`;
  const { error } = await new Resend(RESEND_API_KEY).emails.send({
    from: MAIL_FROM,
    to,
    subject: 'Your GhostDesk license key',
    text: `Thanks for subscribing to GhostDesk.\n\nYour license key: ${key}\n\nDownload the app: ${download}\nOpen GhostDesk and paste the key when asked. You can use it on up to 3 of your devices.\n\nKeep this key private.`,
    html: `<p>Thanks for subscribing to GhostDesk.</p><p>Your license key:</p><p style="font:700 20px ui-monospace,Menlo,monospace;letter-spacing:.05em">${esc(key)}</p><p><a href="${esc(download)}">Download GhostDesk</a>, open it and paste the key when asked. You can use it on up to 3 of your devices.</p><p>Keep this key private.</p>`,
  });
  if (error) throw new Error(`Email failed: ${error.message}`);
}
