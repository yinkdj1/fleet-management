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

  const config = {
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
  };

  console.log(
    `[SMTP] Configuring transporter: host=${config.host}, port=${config.port}, secure=${config.secure}, auth=${Boolean(config.auth)}`
  );

  transporter = nodemailer.createTransport(config);

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

  try {
    console.log(`[SMTP] Attempting to send email to ${to}`);
    await smtpTransporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
      text,
    });
    console.log(`[SMTP] Successfully sent email to ${to}`);

    return {
      sent: true,
      reason: "smtp",
    };
  } catch (error) {
    console.error(
      `[SMTP] Email send failure to ${to}: code=${error?.code}, message=${error?.message || error}`
    );
    error.message = `SMTP send failed: ${error.message || "unknown error"}`;
    throw error;
  }
}

module.exports = {
  hasSmtpConfig,
  sendEmail,
};
