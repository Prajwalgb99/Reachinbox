import nodemailer, { Transporter } from "nodemailer";

const transporterCache = new Map<string, Transporter>();

/**
 * One Ethereal transporter per sender identity (smtpUser/smtpPass), cached
 * so we don't reconnect on every send. Supporting multiple senders is what
 * lets per-sender rate limiting mean anything.
 */
function getTransporter(smtpUser: string, smtpPass: string): Transporter {
  const cacheKey = smtpUser;
  const existing = transporterCache.get(cacheKey);
  if (existing) return existing;

  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  transporterCache.set(cacheKey, transporter);
  return transporter;
}

export async function sendEmail(params: {
  smtpUser: string;
  smtpPass: string;
  to: string;
  subject: string;
  body: string;
}) {
  const transporter = getTransporter(params.smtpUser, params.smtpPass);
  const info = await transporter.sendMail({
    from: params.smtpUser,
    to: params.to,
    subject: params.subject,
    html: params.body,
  });

  // Ethereal gives a preview URL instead of actually delivering anywhere,
  // which is exactly what makes it useful for a demo.
  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
  return { messageId: info.messageId, previewUrl };
}

/**
 * Creates a throwaway Ethereal test account. Used at boot when no
 * ETHEREAL_USER/PASS is pinned in .env, and by the "add sender" flow so a
 * user can spin up additional sender identities from the dashboard.
 */
export async function createEtherealAccount() {
  const account = await nodemailer.createTestAccount();
  return { user: account.user, pass: account.pass };
}
