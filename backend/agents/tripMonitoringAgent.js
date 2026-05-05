// Trip Monitoring Agent
// Handles pre-pickup alerts, midway check-ins, return reminders, and daily fleet reports.
// Uses Claude to write personalized SMS/email messages for each guest notification.
// Deduplication uses the Prisma Document table so state survives server restarts.
// Late-return/overdue logic is handled separately by tripMonitoringService.js.

"use strict";

const Anthropic = require("@anthropic-ai/sdk");
const prisma = require("../src/config/db");
const { sendSMS } = require("../src/services/smsService");
const { sendEmail: _sendEmail } = require("../src/services/emailService");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@carsgidi.com";
const WINDOW_MS = 10 * 60 * 1000; // 10-minute match window

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function sendEmail(to, subject, text) {
  return _sendEmail({ to, subject, text, html: `<p>${text.replace(/\n/g, "<br>")}</p>` });
}

// --- LLM message generation ---
// Calls Claude to write a short, personalized message. Falls back to a default if unavailable.

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

    // Guest: pickup reminder (~10 min before)
    if (now < pickup && msTillPickup < WINDOW_MS) {
      await sendIfNew(id, "pickup-reminder", async () => {
        const ctx = { firstName: customer.firstName, vehicleLabel };
        if (customer.phone) {
          const sms = await generateMessage("pickup-sms", ctx, `Hi ${customer.firstName}, it's almost time to pick up your ${vehicleLabel} at Carsgidi!`);
          await sendSMS(customer.phone, sms);
        }
        if (customer.email) {
          const body = await generateMessage("pickup-email", ctx, `Hi ${customer.firstName}, it's time to pick up your ${vehicleLabel}. Please check in at Carsgidi.`);
          await sendEmail(customer.email, "Car Pickup Reminder", body);
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
          const sms = await generateMessage("midway-sms", ctx, `Hi ${customer.firstName}, hope you're enjoying your ${vehicleLabel}! Need to extend? Visit carsgidi.com.`);
          await sendSMS(customer.phone, sms);
        }
        if (customer.email) {
          const body = await generateMessage("midway-email", ctx, `Hi ${customer.firstName}, hope your trip is going well! Need to extend your rental? Visit carsgidi.com.`);
          await sendEmail(customer.email, "Trip Check-in", body);
        }
      });
    }

    // Guest: return reminder (~10 min before dropoff)
    if (now < dropoff && dropoff - now < WINDOW_MS) {
      await sendIfNew(id, "dropoff-reminder", async () => {
        const ctx = { firstName: customer.firstName, vehicleLabel };
        if (customer.phone) {
          const sms = await generateMessage("dropoff-sms", ctx, `Hi ${customer.firstName}, please return your ${vehicleLabel} to Carsgidi shortly. Thank you!`);
          await sendSMS(customer.phone, sms);
        }
        if (customer.email) {
          const body = await generateMessage("dropoff-email", ctx, `Hi ${customer.firstName}, please return your ${vehicleLabel} shortly. Thank you for choosing Carsgidi!`);
          await sendEmail(customer.email, "Return Reminder", body);
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

// --- Main runner ---

async function runAgent() {
  await runTripNotifications();

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
