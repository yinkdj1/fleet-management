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

      // Smart extension offer logic
      const marker = await hasExtensionOfferMarker(booking.id);
      if (!marker) {
        // Send extension offer to guest
        try {
          const { buildGuestManageLinks } = bookingService;
          const links = buildGuestManageLinks(booking);
          const subject = `Your booking is overdue - extend now?`;
          const html = `<p>Your booking #${booking.id} is overdue. <br>You can extend your trip instantly here: <a href="${links.modifyUrl}">${links.modifyUrl}</a></p>`;
          if (booking.customer?.email) {
            await sendEmail({ to: booking.customer.email, subject, html, text: html.replace(/<[^>]+>/g, "") });
          }
          if (booking.customer?.phone) {
            await sendSMS(booking.customer.phone, `Your booking #${booking.id} is overdue. Extend here: ${links.modifyUrl}`);
          }
          await markExtensionOfferSent(booking.id);
        } catch (linkError) {
          console.error(`[TripMonitor] Failed to send extension offer for booking #${booking.id}:`, linkError);
          // Continue processing other bookings even if this one fails
        }
      } else {
        // Check if ignored for > EXTENSION_IGNORE_HOURS
        const sentTime = marker.fileUrl?.replace("sent:", "");
        if (sentTime) {
          const sentDate = new Date(sentTime);
          if (now - sentDate > EXTENSION_IGNORE_HOURS * 60 * 60 * 1000) {
            // Only notify admin once — check for a separate admin-notified marker
            const prisma = require("../config/db");
            const adminMarker = await prisma.document.findFirst({
              where: { bookingId: Number(booking.id), documentType: "extension_admin_notified" },
              select: { id: true },
            });
            if (!adminMarker) {
              await notifyAdminExtensionIgnored(booking);
              await prisma.document.create({
                data: {
                  bookingId: Number(booking.id),
                  documentType: "extension_admin_notified",
                  fileUrl: `sent:${new Date().toISOString()}`,
                },
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
}

module.exports = { monitorTrips };