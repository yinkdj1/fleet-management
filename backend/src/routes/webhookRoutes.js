const express = require("express");
const router = express.Router();
const twilio = require("twilio");

/**
 * POST /api/webhooks/sms
 * Twilio calls this URL when an inbound SMS is received.
 * Configure this URL in Twilio Console → Phone Numbers → Active Numbers → SMS Webhook.
 */
router.post("/sms", (req, res) => {
  const { From, Body } = req.body;

  console.log(`[Twilio] Inbound SMS from ${From}: ${Body}`);

  // Handle guest replies here — e.g. "EXTEND", "STOP", etc.
  const reply = handleInboundSMS(From, Body);

  // Respond with TwiML
  const twiml = new twilio.twiml.MessagingResponse();
  if (reply) {
    twiml.message(reply);
  }

  res.type("text/xml").send(twiml.toString());
});

/**
 * Determine auto-reply based on message content.
 * Expand this with your own logic.
 */
function handleInboundSMS(from, body) {
  const text = (body || "").trim().toUpperCase();

  if (text === "EXTEND") {
    return "To extend your booking, please visit your account portal or call us.";
  }

  if (text === "STOP") {
    // Twilio handles STOP opt-outs automatically — no reply needed
    return null;
  }

  if (text === "HELP") {
    return "Reply EXTEND to request a trip extension. For support, visit carsgidi.com or call us.";
  }

  // Default: no auto-reply (or send a generic one)
  return null;
}

module.exports = router;
