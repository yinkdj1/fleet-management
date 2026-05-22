// Trip Monitoring Email Service
// Handles sending emails for overdue bookings separately from the monitoring API

const bookingService = require("./bookingService");
const { sendEmail } = require("./emailService");
const { sendSMS } = require("./smsService");
const { monitorTrips } = require("./tripMonitoringService");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

async function markExtensionOfferSent(bookingId) {
  const prisma = require("../config/db");
  await prisma.document.create({
    data: {
      bookingId: Number(bookingId),
      documentType: "extension_offer_sent",
      fileUrl: `sent:${new Date().toISOString()}`,
    },
  });
}

async function markAdminNotificationSent(bookingId) {
  const prisma = require("../config/db");
  await prisma.document.create({
    data: {
      bookingId: Number(bookingId),
      documentType: "extension_admin_notified",
      fileUrl: `sent:${new Date().toISOString()}`,
    },
  });
}

async function sendExtensionOfferEmail(booking) {
  try {
    const { buildGuestManageLinks } = bookingService;
    const links = buildGuestManageLinks(booking);
    const subject = `Your booking is overdue - extend now?`;
    const html = `<p>Your booking #${booking.id} is overdue. <br>You can extend your trip instantly here: <a href="${links.modifyUrl}">${links.modifyUrl}</a></p>`;
    
    if (booking.customer?.email) {
      await sendEmail({ 
        to: booking.customer.email, 
        subject, 
        html, 
        text: html.replace(/<[^>]+>/g, "") 
      });
      console.log(`[TripMonitorEmail] Sent extension offer email to booking #${booking.id}`);
    }
    
    if (booking.customer?.phone) {
      await sendSMS(
        booking.customer.phone, 
        `Your booking #${booking.id} is overdue. Extend here: ${links.modifyUrl}`
      );
      console.log(`[TripMonitorEmail] Sent extension offer SMS to booking #${booking.id}`);
    }
    
    await markExtensionOfferSent(booking.id);
    return { success: true, bookingId: booking.id };
  } catch (error) {
    console.error(`[TripMonitorEmail] Failed to send extension offer for booking #${booking.id}:`, error);
    return { success: false, bookingId: booking.id, error: error.message };
  }
}

async function sendAdminNotificationEmail(booking) {
  try {
    const subject = `Guest ignored extension offer for booking #${booking.id}`;
    const html = `<p>Booking #${booking.id} is overdue/late. Guest did not respond to extension offer.<br>
Guest: ${booking.customer?.firstName} ${booking.customer?.lastName} (${booking.customer?.email})<br>
Return: ${booking.returnDatetime}</p>`;
    
    await sendEmail({ 
      to: ADMIN_EMAIL, 
      subject, 
      html, 
      text: html.replace(/<[^>]+>/g, "") 
    });
    
    await markAdminNotificationSent(booking.id);
    console.log(`[TripMonitorEmail] Sent admin notification for booking #${booking.id}`);
    return { success: true, bookingId: booking.id };
  } catch (error) {
    console.error(`[TripMonitorEmail] Failed to send admin notification for booking #${booking.id}:`, error);
    return { success: false, bookingId: booking.id, error: error.message };
  }
}

async function processMonitoringEmails() {
  console.log('[TripMonitorEmail] Starting email processing job...');
  
  try {
    // Get all alerts from monitoring service
    const alerts = await monitorTrips();
    
    // Filter for internal alerts that need email actions
    const extensionOfferAlerts = alerts.filter(a => a.type === 'needs_extension_offer' && a.internal);
    const adminNotificationAlerts = alerts.filter(a => a.type === 'needs_admin_notification' && a.internal);
    
    const results = {
      extensionOffers: [],
      adminNotifications: [],
      timestamp: new Date().toISOString(),
    };
    
    // Process extension offer emails
    for (const alert of extensionOfferAlerts) {
      // Fetch full booking data
      const booking = await bookingService.getBookingById(alert.bookingId);
      const result = await sendExtensionOfferEmail(booking);
      results.extensionOffers.push(result);
    }
    
    // Process admin notification emails
    for (const alert of adminNotificationAlerts) {
      // Fetch full booking data
      const booking = await bookingService.getBookingById(alert.bookingId);
      const result = await sendAdminNotificationEmail(booking);
      results.adminNotifications.push(result);
    }
    
    console.log(`[TripMonitorEmail] Processed ${results.extensionOffers.length} extension offers, ${results.adminNotifications.length} admin notifications`);
    
    return results;
  } catch (error) {
    console.error('[TripMonitorEmail] Error processing monitoring emails:', error);
    throw error;
  }
}

module.exports = {
  processMonitoringEmails,
  sendExtensionOfferEmail,
  sendAdminNotificationEmail,
};
