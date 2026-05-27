const nodemailer = require("nodemailer");
const https = require("https");

let transporter = null;

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM);
}

function hasSendGridConfig() {
  return Boolean(
    process.env.SENDGRID_API_KEY &&
      (process.env.SENDGRID_FROM || process.env.SMTP_FROM)
  );
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

async function sendGridEmail({ to, subject, html, text }) {
  const from = process.env.SENDGRID_FROM || process.env.SMTP_FROM;
  const payload = JSON.stringify({
    personalizations: [
      {
        to: [{ email: to }],
      },
    ],
    from: { email: from },
    subject,
    content: [
      {
        type: "text/plain",
        value: text || html || "",
      },
      {
        type: "text/html",
        value: html || text || "",
      },
    ],
  });

  const options = {
    method: "POST",
    hostname: "api.sendgrid.com",
    path: "/v3/mail/send",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  console.log(`[SendGrid] Sending email to ${to} from ${from}`);

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk.toString();
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[SendGrid] Email sent to ${to} (status ${res.statusCode})`);
          return resolve({ sent: true, reason: "sendgrid" });
        }

        const err = new Error(
          `SendGrid request failed with status ${res.statusCode}: ${body || res.statusMessage}`
        );
        err.code = `sendgrid_${res.statusCode}`;
        console.error(
          `[SendGrid] Email send failure to ${to}: code=${err.code}, message=${err.message}`
        );
        reject(err);
      });
    });

    req.on("error", (error) => {
      console.error(`[SendGrid] Request error: ${error?.message || error}`);
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

async function sendEmail({ to, subject, html, text }) {
  if (hasSendGridConfig()) {
    return await sendGridEmail({ to, subject, html, text });
  }

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
  hasSendGridConfig,
  sendEmail,
};
