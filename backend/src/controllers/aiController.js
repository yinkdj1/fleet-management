const Anthropic = require("@anthropic-ai/sdk");
const prisma = require("../config/db");
const { getDiscountSettings } = require("../services/discountSettingsService");

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function buildSystemPrompt() {
  let settings = null;
  try {
    settings = await getDiscountSettings();
  } catch (e) {
    // fall through to defaults
  }

  const protectionFee =
    settings?.protectionPlanFeePerDay > 0
      ? `$${settings.protectionPlanFeePerDay}/day`
      : "contact us for pricing";
  const deposit = settings?.depositAmount ?? 100;
  const taxRate = settings?.taxPercentage ?? 7;
  const pickupLocation = settings?.pickupLocation ?? "Main Office";
  const mileageLimit = process.env.DAILY_MILEAGE_LIMIT || "200";
  const overmileageRate = process.env.OVERMILEAGE_RATE_PER_MILE || "0.25";
  const discountTiers =
    settings?.tiers?.length > 0
      ? settings.tiers.map((t) => `${t.minDays}+ days: ${t.percentage}% off`).join(", ")
      : "3+ days: 5% off, 7+ days: 10% off, 14+ days: 15% off";

  return `You are Ashake, a friendly customer service assistant for Carsgidi, a car rental platform.

CURRENT PRICING & POLICIES:
- Refundable security deposit: $${deposit}
- Tax rate: ${taxRate}%
- Pickup/return location: ${pickupLocation}
- Multi-day discounts: ${discountTiers}
- Protection plan: ${protectionFee} per day
- Mileage allowance: ${mileageLimit} miles/day included free. Extra miles charged at $${overmileageRate}/mile.

PROTECTION PLAN:
- Optional add-on selected at checkout
- Covers: collision damage, theft, weather/fire damage, and third-party liability
- Without coverage, the renter is fully responsible for all damage repair costs
- Does NOT cover: personal belongings, traffic violations, fuel, or intentional damage
- Strongly recommended for longer trips or unfamiliar areas

MILEAGE POLICY:
- Every rental includes ${mileageLimit} miles per day (e.g. a 3-day rental = ${
    parseInt(mileageLimit) * 3
  } free miles total)
- Miles are tracked via odometer reading at checkout and checkin
- Over-mileage fee: $${overmileageRate} per mile beyond the included amount
- Unused miles do not roll over between days

YOUR RESPONSIBILITIES:
1. Answer questions about vehicle rental policies, pricing, and bookings
2. Explain the protection plan and mileage policy clearly
3. Look up a customer's booking when they provide their booking ID, last name, and email or phone
4. Help customers understand booking dates, costs, and status
5. Guide through modification and cancellation processes
6. Escalate to human support when needed

To look up a booking, you need the customer to provide: booking ID, last name, and email OR phone number.

Carsgidi website: https://www.carsgidi.com
Keep responses concise, friendly, and professional.`;
}

async function lookupBooking({ bookingId, lastName, email, phone }) {
  if (!bookingId || !lastName || (!email && !phone)) return null;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: { customer: true, vehicle: true, checkout: true, checkin: true },
    });

    if (!booking) return { error: "not_found" };

    const norm = (s) => (s || "").trim().toLowerCase();
    const digitsOnly = (s) => (s || "").replace(/\D/g, "");

    const lastNameMatch = norm(lastName) === norm(booking.customer?.lastName);
    const emailMatch = email && norm(email) === norm(booking.customer?.email);
    const phoneMatch =
      phone && digitsOnly(phone) === digitsOnly(booking.customer?.phone);

    if (!lastNameMatch || (!emailMatch && !phoneMatch)) {
      return { error: "verification_failed" };
    }

    return booking;
  } catch (e) {
    return null;
  }
}

function formatBookingContext(booking) {
  const v = booking.vehicle;
  const pickup = new Date(booking.pickupDatetime).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const returnDate = new Date(booking.returnDatetime).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `VERIFIED BOOKING ON FILE:
- Booking ID: #${booking.id}
- Customer: ${booking.customer.firstName} ${booking.customer.lastName}
- Vehicle: ${v.year} ${v.make} ${v.model}${v.color ? ` (${v.color})` : ""} — Plate: ${v.plateNumber}
- Pickup: ${pickup}
- Return: ${returnDate}
- Status: ${booking.status}
- Payment: ${booking.paymentStatus}
- Total: $${booking.totalAmount.toFixed(2)} (subtotal $${booking.subtotal.toFixed(2)}, tax $${booking.tax.toFixed(2)}, deposit $${booking.deposit.toFixed(2)})
- Odometer out: ${booking.checkout?.mileageOut ?? "not yet checked out"}
- Odometer in: ${booking.checkin?.mileageIn ?? "not yet returned"}`;
}

// POST /api/ai/chat
async function handleChat(req, res, next) {
  try {
    const { message, bookingContext, history } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Message is required and must be a non-empty string",
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        message: "Chat service is not configured. Please contact support.",
      });
    }

    let systemPrompt = await buildSystemPrompt();

    // Inject verified booking if context provided
    if (bookingContext?.bookingId) {
      const result = await lookupBooking(bookingContext);
      if (result && !result.error) {
        systemPrompt += "\n\n" + formatBookingContext(result);
      } else if (result?.error === "verification_failed") {
        systemPrompt +=
          "\n\nNote: The customer attempted to load booking #" +
          bookingContext.bookingId +
          " but verification failed. Do not reveal booking details.";
      }
    }

    // Build message list — include last 10 turns of history
    const messages = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-10)) {
        if (turn.role === "user" || turn.role === "assistant") {
          messages.push({ role: turn.role, content: String(turn.content) });
        }
      }
    }
    messages.push({ role: "user", content: message.trim() });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const assistantMessage = response.content[0].text;

    res.json({
      message: assistantMessage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat API error:", error.message || error);

    if (error.status === 401) {
      return res.status(500).json({
        message: "Authentication error with chat service. Please try again later.",
      });
    }

    next(error);
  }
}

module.exports = {
  handleChat,
};
