const twilio = require("twilio");

let client = null;

function hasTwilioConfig() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

function getClient() {
  if (client) return client;

  if (!hasTwilioConfig()) {
    return null;
  }

  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client;
}

/**
 * Send an SMS via Twilio.
 * @param {string} to   - Recipient phone number in E.164 format (e.g. +2348012345678)
 * @param {string} body - Message text
 * @returns {{ sent: boolean, reason: string, sid?: string }}
 */
async function sendSMS(to, body) {
  const twilioClient = getClient();

  if (!twilioClient) {
    console.warn("[smsService] Twilio is not configured. SMS not sent.");
    return { sent: false, reason: "twilio_not_configured" };
  }

  if (!to) {
    return { sent: false, reason: "no_recipient" };
  }

  const message = await twilioClient.messages.create({
    body,
    from: process.env.TWILIO_FROM_NUMBER,
    to,
  });

  return { sent: true, reason: "twilio", sid: message.sid };
}

module.exports = {
  hasTwilioConfig,
  sendSMS,
};
