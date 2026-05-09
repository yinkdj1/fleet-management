// Trip Monitoring Agent
// Handles pre-pickup alerts, midway check-ins, return reminders, daily fleet reports,
// overdue/late-return detection, and automatic pre-checkout prompts.
// Uses Claude to write personalized SMS/email messages for each guest notification.
// Deduplication uses the Prisma Document table so state survives server restarts.

"use strict";

const Anthropic = require("@anthropic-ai/sdk");
const prisma = require("../src/config/db");
const { sendSMS } = require("../src/services/smsService");
const { sendEmail: _sendEmail } = require("../src/services/emailService");
const {
  processAutomaticPrecheckoutPrompts,
  getActiveTemplate,
  renderSmsTemplate,
  buildGuestManageLinks,
} = require("../src/services/bookingService");
const { monitorTrips } = require("../src/services/tripMonitoringService");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@carsgidi.com";
const WINDOW_MS = 10 * 60 * 1000; // 10-minute match window

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function sendEmail(to, subject, text) {
  return _sendEmail({ to, subject, text, html: `<p>${text.replace(/\n/g, "<br>")}</p>` });
}

// --- LLM message generation ---
// Calls Claude to write a short, personalized message. Falls back to a default if unavailable.

/**
 * Try to find a DB template body for anchor+channel, rendered with booking data.
 * Returns null if no template is active, so caller can fall back to Claude/hardcoded.
 */
async function getTemplateBody(anchor, channel, booking, links) {
  try {
    const template = await getActiveTemplate(anchor, channel);
    if (!template) return null;
    return renderSmsTemplate(template.body, booking, links);
  } catch {
    return null;
  }
}

async function generateMessage(event, context, fallback) {
  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  const prompts = {
    "pickup-sms": `Write a short, friendly SMS (max 160 chars) for a car rental reminder. The customer's first name is ${context.firstName}, and they're picking up a ${context.vehicleLabel} from Carsgidi shortly. Be warm and concise. No hashtags.`,
    "pickup-email": `Write a short, friendly email body (2-3 sentences) reminding ${context.firstName} to pick up their ${context.vehicleLabel} at Carsgidi. Be professional but warm.`,
    "midway-sms": `Write a short, friendly SMS (max 160 chars) checking in with ${context.firstName} who is mid-way through renting a ${context.vehicleLabel} from Carsgidi. Mention they can extend at carsgidi.com if needed.`,
    "midway-email": `Write a short, friendly email body (2-3 sentences) checking in with ${context.firstName}, who is mid-way through their ${context.vehicleLabel} rental with Carsgidi. Mention they can extend at carsgidi.com.`,
    "dropoff-sms": `Write a short, friendly SMS (max 160 chars) reminding ${context.firstName} to return their ${context.vehicleLabel} to Carsgidi soon. Be warm and appreciative.`,
    "dropoff-email": `Write a short, friendly email body (2-3 sentences) reminding ${context.firstName} to return their ${context.vehicleLabel} to Carsgidi. Express appreciation for choosing Carsgidi.`,
  };

  const prompt = prompts[event];
  if (!prompt) return fallback;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });
    return response.content[0]?.text?.trim() || fallback;
  } catch (err) {
    console.error(`[TripMonitor] Claude error for ${event}:`, err.message);
    return fallback;
  }
}

// --- Deduplication via Document table ---
// Uses documentType = "notification:<eventType>" so it persists across restarts.

async function wasAlreadySent(bookingId, eventType) {
  const existing = await prisma.document.findFirst({
    where: { bookingId, documentType: `notification:${eventType}` },
    select: { id: true },
  });
  return Boolean(existing);
}

async function markSent(bookingId, eventType) {
  await prisma.document.create({
    data: {
      bookingId,
      documentType: `notification:${eventType}`,
      fileUrl: `sent:${new Date().toISOString()}`,
    },
  });
}

async function sendIfNew(bookingId, eventType, action) {
  if (await wasAlreadySent(bookingId, eventType)) return;
  await markSent(bookingId, eventType);
  await action();
}

// --- Main notification loop ---

async function runTripNotifications() {
  const now = new Date();
  let bookings;

  try {
    bookings = await prisma.booking.findMany({
      where: { status: { in: ["reserved", "active"] } },
      include: { customer: true, vehicle: true, checkin: true },
    });
  } catch (err) {
    console.error("[TripMonitor] DB error:", err.message);
    return;
  }

  for (const booking of bookings) {
    const { id, customer, vehicle } = booking;
    const pickup = new Date(booking.pickupDatetime);
    const dropoff = new Date(booking.returnDatetime);
    const midway = new Date((pickup.getTime() + dropoff.getTime()) / 2);
    const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const guestName = `${customer.firstName} ${customer.lastName}`;
    const msTillPickup = pickup - now;

    // Build guest manage links (may fail if customer data incomplete)
    let links = null;
    try { links = buildGuestManageLinks(booking); } catch { /* skip */ }

    // Guest: pickup reminder (~10 min before)
    if (now < pickup && msTillPickup < WINDOW_MS) {
      await sendIfNew(id, "pickup-reminder", async () => {
        const ctx = { firstName: customer.firstName, vehicleLabel };
        if (customer.phone) {
          const body = (await getTemplateBody("pickup", "sms", booking, links))
            || (await generateMessage("pickup-sms", ctx, `Hi ${customer.firstName}, your ${vehicleLabel} pickup at Carsgidi is in a few minutes! We're ready for you.`));
          await sendSMS(customer.phone, body);
        }
        if (customer.email) {
          const body = (await getTemplateBody("pickup", "email", booking, links))
            || (await generateMessage("pickup-email", ctx, `Hi ${customer.firstName}, it's almost time to pick up your ${vehicleLabel} at Carsgidi! Please head over to check in your vehicle. We're excited to have you hit the road. If you have any questions, don't hesitate to reach out.`));
          await sendEmail(customer.email, `${customer.firstName}, your ${vehicleLabel} is ready for pickup!`, body);
        }
      });
    }

    // Admin: 1hr before pickup (50–70 min window)
    if (msTillPickup > 0 && msTillPickup < 70 * 60 * 1000 && msTillPickup > 50 * 60 * 1000) {
      await sendIfNew(id, "admin-pickup-1hr", async () => {
        await sendEmail(ADMIN_EMAIL, "Upcoming Pickup", `Booking #${id} — ${guestName} is picking up the ${vehicleLabel} in ~1 hour at ${pickup.toLocaleString()}.`);
      });
    }

    // Guest: midway check-in
    if (now > pickup && now < dropoff && Math.abs(now - midway) < WINDOW_MS) {
      await sendIfNew(id, "midway-checkin", async () => {
        const ctx = { firstName: customer.firstName, vehicleLabel };
        if (customer.phone) {
          const extendPart = links ? ` Need to extend? ${links.modifyUrl}` : " Need to extend? Visit carsgidi.com.";
          const body = (await getTemplateBody("midpoint", "sms", booking, links))
            || (await generateMessage("midway-sms", ctx, `Hi ${customer.firstName}, hope you're enjoying your ${vehicleLabel} rental!${extendPart}`));
          await sendSMS(customer.phone, body);
        }
        if (customer.email) {
          const extendLink = links ? `<a href="${links.modifyUrl}">extend your rental here</a>` : "visit carsgidi.com to extend";
          const body = (await getTemplateBody("midpoint", "email", booking, links))
            || (await generateMessage("midway-email", ctx, `Hi ${customer.firstName}, we're checking in on your ${vehicleLabel} rental — hope everything is going great! If you'd like more time, you can ${extendLink}. We're here if you need anything.`));
          await sendEmail(customer.email, `${customer.firstName}, how's your ${vehicleLabel} trip going?`, body);
        }
      });
    }

    // Guest: return reminder (~10 min before dropoff)
    if (now < dropoff && dropoff - now < WINDOW_MS) {
      await sendIfNew(id, "dropoff-reminder", async () => {
        const ctx = { firstName: customer.firstName, vehicleLabel };
        if (customer.phone) {
          const body = (await getTemplateBody("return", "sms", booking, links))
            || (await generateMessage("dropoff-sms", ctx, `Hi ${customer.firstName}, it's almost time to return your ${vehicleLabel} to Carsgidi. Thank you for choosing us — see you soon!`));
          await sendSMS(customer.phone, body);
        }
        if (customer.email) {
          const body = (await getTemplateBody("return", "email", booking, links))
            || (await generateMessage("dropoff-email", ctx, `Hi ${customer.firstName}, just a heads up that your ${vehicleLabel} rental is ending soon. Please return the vehicle to Carsgidi at your scheduled drop-off time. Thank you so much for choosing us — we hope you had a wonderful trip!`));
          await sendEmail(customer.email, `${customer.firstName}, thank you for renting with Carsgidi!`, body);
        }
      });
    }
  }
}

// --- Daily fleet availability report (sent once at/after 7am) ---

let lastReportDate = null;

async function sendDailyFleetReport() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  let pickups, returns;
  try {
    [pickups, returns] = await Promise.all([
      prisma.booking.findMany({
        where: {
          pickupDatetime: { gte: startOfDay, lte: endOfDay },
          status: { in: ["reserved", "active"] },
        },
        include: { customer: true, vehicle: true },
        orderBy: { pickupDatetime: "asc" },
      }),
      prisma.booking.findMany({
        where: {
          returnDatetime: { gte: startOfDay, lte: endOfDay },
          status: { in: ["reserved", "active"] },
        },
        include: { customer: true, vehicle: true },
        orderBy: { returnDatetime: "asc" },
      }),
    ]);
  } catch (err) {
    console.error("[TripMonitor] Fleet report DB error:", err.message);
    return;
  }

  const fmt = (d) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtRow = (b, timeField) =>
    `  #${b.id}  ${b.customer.firstName} ${b.customer.lastName}  |  ${b.vehicle.year} ${b.vehicle.make} ${b.vehicle.model} (${b.vehicle.plateNumber})  @  ${fmt(b[timeField])}`;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines = [
    `Fleet Availability Report — ${today}`,
    "",
    `PICKUPS TODAY (${pickups.length})`,
    pickups.length > 0 ? pickups.map((b) => fmtRow(b, "pickupDatetime")).join("\n") : "  None",
    "",
    `RETURNS TODAY (${returns.length})`,
    returns.length > 0 ? returns.map((b) => fmtRow(b, "returnDatetime")).join("\n") : "  None",
    "",
    `Total fleet movements today: ${pickups.length + returns.length}`,
  ];

  await sendEmail(ADMIN_EMAIL, `Fleet Report — ${today}`, lines.join("\n"));
  console.log(`[TripMonitor] Daily report sent: ${pickups.length} pickups, ${returns.length} returns`);
}

// --- Overdue / late return monitoring ---

async function runOverdueCheck() {
  try {
    const alerts = await monitorTrips();
    if (alerts.length > 0) {
      console.log(`[TripMonitor] Overdue alerts: ${alerts.map((a) => `#${a.bookingId}(${a.type})`).join(", ")}`);
    }
  } catch (err) {
    console.error("[TripMonitor] Overdue check error:", err.message);
  }
}

// --- Precheckout prompt runner ---
// Delegates to bookingService which handles deduplication and the 24hr window.
// Running every 5 min (vs the server scheduler's 15 min) catches same-day bookings quickly.

async function runPrecheckoutCheck() {
  try {
    const summary = await processAutomaticPrecheckoutPrompts();
    if (summary.scanned > 0) {
      console.log(`[TripMonitor] Precheckout: scanned=${summary.scanned}, sent=${summary.sent}, skipped=${summary.skipped}`);
    }
  } catch (err) {
    console.error("[TripMonitor] Precheckout check error:", err.message);
  }
}

// --- Main runner ---

async function runAgent() {
  await runTripNotifications();
  await runOverdueCheck();
  await runPrecheckoutCheck();

  // Send daily fleet report once per day at or after 7am
  const now = new Date();
  const todayStr = now.toDateString();
  if (now.getHours() >= 7 && lastReportDate !== todayStr) {
    lastReportDate = todayStr;
    await sendDailyFleetReport();
  }
}

// Run every 5 minutes
setInterval(runAgent, 5 * 60 * 1000);

// Run once on startup
runAgent().catch((err) => console.error("[TripMonitor] Startup error:", err.message));

module.exports = { runAgent, sendDailyFleetReport };
