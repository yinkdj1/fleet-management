const nodemailer = require("nodemailer");

let transporter = null;

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM);
}

function getTransporter() {
  if (transporter) return transporter;

  if (!hasSmtpConfig()) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: toBoolean(process.env.SMTP_SECURE),
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const smtpTransporter = getTransporter();

  if (!smtpTransporter) {
    return {
      sent: false,
      reason: "smtp_not_configured",
    };
  }

  await smtpTransporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
    text,
  });

  return {
    sent: true,
    reason: "smtp",
  };
}

module.exports = {
  hasSmtpConfig,
  sendEmail,
};
