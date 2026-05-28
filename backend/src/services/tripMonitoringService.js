// Trip Monitoring Service
// Scans active bookings for issues (overdue, missing check-in, etc.)


const bookingService = require("./bookingService");
const { sendEmail } = require("./emailService");
const { sendSMS } = require("./smsService");

// Configurable: hours to wait before admin notification if guest ignores extension offer
const EXTENSION_IGNORE_HOURS = 2;
const EXTENSION_TRACKER_TYPE = "extension_offer_sent";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

async function markExtensionOfferSent(bookingId) {
  // Use a document marker to track extension offer
  const prisma = require("../config/db");
  await prisma.document.create({
    data: {
      bookingId: Number(bookingId),
      documentType: EXTENSION_TRACKER_TYPE,
      fileUrl: `sent:${new Date().toISOString()}`,
    },
  });
}

async function hasExtensionOfferMarker(bookingId) {
  const prisma = require("../config/db");
  const marker = await prisma.document.findFirst({
    where: {
      bookingId: Number(bookingId),
      documentType: EXTENSION_TRACKER_TYPE,
    },
    select: { id: true, fileUrl: true },
  });
  return marker;
}

async function notifyAdminExtensionIgnored(booking) {
  const subject = `Guest ignored extension offer for booking #${booking.id}`;
  const html = `<p>Booking #${booking.id} is overdue/late. Guest did not respond to extension offer.<br>
Guest: ${booking.customer?.firstName} ${booking.customer?.lastName} (${booking.customer?.email})<br>
Return: ${booking.returnDatetime}</p>`;
  await sendEmail({ to: ADMIN_EMAIL, subject, html, text: html.replace(/<[^>]+>/g, "") });
}
async function monitorTrips() {
  try {
    // Fetch all active bookings
    const { data: bookings } = await bookingService.getBookings({ status: "active", limit: 10000 });
    const now = new Date();
    const alerts = [];
    
    console.log(`[TripMonitor] Checking ${bookings.length} active bookings at ${now.toISOString()}`);

    for (const booking of bookings) {
    const isLate = booking.status === "active" && new Date(booking.returnDatetime) < now;
    
    if (isLate) {
      console.log(`[TripMonitor] Found late booking #${booking.id}, return was ${booking.returnDatetime}`);
    }
    
    if (isLate) {
      const hoursOverdue = (now - new Date(booking.returnDatetime)) / (1000 * 60 * 60);
      
      // Determine late fee status
      let lateFeeStatus = null;
      let extraDayFeeStatus = null;
      
      if (hoursOverdue >= 2 && !booking.lateFeeCharged && !booking.lateFeeSkipped) {
        lateFeeStatus = "eligible"; // Can charge $20 late fee
      } else if (booking.lateFeeCharged) {
        lateFeeStatus = "charged";
      } else if (booking.lateFeeSkipped) {
        lateFeeStatus = "skipped";
      }
      
      if (hoursOverdue >= 6 && !booking.extraDayFeeCharged) {
        extraDayFeeStatus = "eligible"; // Can charge extra day fee
      } else if (booking.extraDayFeeCharged) {
        extraDayFeeStatus = "charged";
      }
      
      alerts.push({
        bookingId: booking.id,
        type: "overdue",
        message: `Booking ${booking.id} is overdue for return.`,
        hoursOverdue: Math.floor(hoursOverdue),
        lateFeeStatus,
        extraDayFeeStatus,
        booking, // Include full booking data for frontend
      });

      // Track if extension offer needs to be sent (don't send here, just flag it)
      const marker = await hasExtensionOfferMarker(booking.id);
      // Only request extension offers for bookings overdue by configured threshold (>= 2 hours)
      if (!marker && hoursOverdue >= 2) {
        alerts.push({
          bookingId: booking.id,
          type: "needs_extension_offer",
          message: `Booking ${booking.id} needs extension offer email (overdue ${Math.floor(hoursOverdue)}h)`,
          internal: true, // Don't show to frontend
        });
      } else {
        // Check if admin needs to be notified about ignored extension
        const sentTime = marker.fileUrl?.replace("sent:", "");
        if (sentTime) {
          const sentDate = new Date(sentTime);
          if (now - sentDate > EXTENSION_IGNORE_HOURS * 60 * 60 * 1000) {
            const prisma = require("../config/db");
            const adminMarker = await prisma.document.findFirst({
              where: { bookingId: Number(booking.id), documentType: "extension_admin_notified" },
              select: { id: true },
            });
            if (!adminMarker) {
              alerts.push({
                bookingId: booking.id,
                type: "needs_admin_notification",
                message: `Admin needs notification about ignored extension for booking ${booking.id}`,
                internal: true, // Don't show to frontend
              });
            }
          }
        }
      }
    }
    // Existing alerts
    if (
      booking.status === "active" &&
      new Date(booking.returnDatetime) < now &&
      !booking.checkin
    ) {
      alerts.push({
        bookingId: booking.id,
        type: "missing_checkin",
        message: `Booking ${booking.id} has no check-in recorded after return time.`,
      });
    }
    if (
      booking.status === "active" &&
      (!booking.paymentStatus || booking.paymentStatus !== "paid")
    ) {
      alerts.push({
        bookingId: booking.id,
        type: "payment_issue",
        message: `Booking ${booking.id} is active but payment is not marked as paid.`,
      });
    }
    if (
      booking.status === "active" &&
      new Date(booking.returnDatetime) < now &&
      new Date(booking.returnDatetime).getTime() > now.getTime() - 24 * 60 * 60 * 1000
    ) {
      alerts.push({
        bookingId: booking.id,
        type: "late_return",
        message: `Booking ${booking.id} is late for return (within 24h grace period).`,
      });
    }
    }

    return alerts;
  } catch (error) {
    console.error('[TripMonitor] Error in monitorTrips:', error);
    throw error;
  }
}

module.exports = { monitorTrips };
