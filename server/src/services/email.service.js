import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

let transporter;

function getTransporter() {
  if (!env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

const appUrl = (path) => `${env.clientOrigins[0]}${path}`;

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;padding:32px">
    <div style="font-size:22px;font-weight:700;color:#4f46e5;margin-bottom:24px">Nexlm</div>
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    ${bodyHtml}
    <p style="font-size:12px;color:#64748b;margin-top:32px">You received this email because of activity on your Nexlm account.</p>
  </div></body></html>`;
}

const button = (href, label) =>
  `<p><a href="${href}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a></p>`;

export async function sendMail({ to, subject, text, html }) {
  const transport = getTransporter();
  if (!transport) {
    logger.info(`[email disabled] ${subject} → ${to}`, { text });
    return;
  }
  await transport.sendMail({ from: env.MAIL_FROM, to, subject, text, html });
}

export function sendVerificationEmail(to, token) {
  const link = appUrl(`/verify-email?token=${token}`);
  return sendMail({
    to,
    subject: 'Verify your Nexlm email address',
    text: `Welcome to Nexlm!\n\nConfirm your email address to start trading: ${link}\n\nIf you did not sign up, you can ignore this email.`,
    html: layout(
      'Confirm your email',
      `<p>Welcome to Nexlm! Confirm your email address to start buying and selling XLM.</p>${button(link, 'Verify email')}`,
    ),
  });
}

export function sendPasswordResetEmail(to, token) {
  const link = appUrl(`/reset-password?token=${token}`);
  return sendMail({
    to,
    subject: 'Reset your Nexlm password',
    text: `Someone requested a password reset for your Nexlm account.\n\nReset it here (valid for 1 hour): ${link}\n\nIf this wasn't you, ignore this email — your password stays the same.`,
    html: layout(
      'Reset your password',
      `<p>Someone requested a password reset for your account. This link is valid for 1 hour.</p>${button(link, 'Reset password')}<p style="color:#64748b">If this wasn't you, ignore this email.</p>`,
    ),
  });
}
