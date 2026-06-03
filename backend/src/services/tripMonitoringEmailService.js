// Trip Monitoring Email Service
// Handles sending emails for overdue bookings separately from the monitoring API

const bookingService = require("./bookingService");
const { sendEmail } = require("./emailService");
const { sendSMS } = require("./smsService");
const { monitorTrips } = require("./tripMonitoringService");
const twilio = require("twilio");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const LATE_RETURN_ALERT_MARKER = "late_return_alert_sent";

let twilioClient;

function hasTwilioSmsConfig() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

function getTwilioClient() {
  if (!twilioClient) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

function normalizePhone(value) {
  if (!value) return null;
  let digits = String(value).trim().replace(/[^\d+]/g, "");
  if (digits.startsWith("+1") && digits.length === 12) return digits;
  if (digits.startsWith("+") && digits.length > 7) return digits;
  digits = digits.replace(/^\+/, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 11) return `+${digits}`;
  return digits || null;
}

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

async function markLateReturnAlertSent(bookingId) {
  const prisma = require("../config/db");
  await prisma.document.create({
    data: {
      bookingId: Number(bookingId),
      documentType: LATE_RETURN_ALERT_MARKER,
      fileUrl: `sent:${new Date().toISOString()}`,
    },
  });
}

async function hasLateReturnAlertMarker(bookingId) {
  const prisma = require("../config/db");
  const marker = await prisma.document.findFirst({
    where: {
      bookingId: Number(bookingId),
      documentType: LATE_RETURN_ALERT_MARKER,
    },
    select: { id: true },
  });
  return Boolean(marker);
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

async function sendLateReturnAlert(booking, alert) {
  try {
    const { getActiveTemplate, renderSmsTemplate, buildGuestManageLinks } = bookingService;
    
    // Try to get guest manage links
    let links = null;
    try {
      links = buildGuestManageLinks(booking);
    } catch (err) {
      console.log(`[TripMonitorEmail] Could not generate guest links for booking #${booking.id}`);
    }
    
    // Get custom templates
    const emailTemplate = await getActiveTemplate("late_return", "email");
    const smsTemplate = await getActiveTemplate("late_return", "sms");
    
    const firstName = booking.customer?.firstName || "Guest";
    const vehicleLabel = `${booking.vehicle?.make || ""} ${booking.vehicle?.model || ""}`.trim() || "your vehicle";
    const lateDays = alert.lateDays || 0;
    const cumulativeLateFee = alert.cumulativeLateFee || 0;
    const totalAmountDue = alert.amountDue || booking.totalAmount || 0;
    
    // Extend booking data with late return specific fields for template rendering
    const extendedBooking = {
      ...booking,
      lateDays,
      cumulativeLateFee,
      totalAmountDue,
    };
    
    // Send email
    if (booking.customer?.email) {
      let subject, html, text;
      
      if (emailTemplate) {
        // Use custom template
        subject = renderSmsTemplate(emailTemplate.subject, extendedBooking, links);
        const bodyText = renderSmsTemplate(emailTemplate.body, extendedBooking, links);
        html = `<p>${bodyText.replace(/\n/g, '<br>')}</p>`;
        text = bodyText;
      } else {
        // Default template
        subject = `Booking #${booking.id} - Late Return Alert`;
        html = `<p>Hi ${firstName},</p>
<p>Your booking #${booking.id} for ${vehicleLabel} is now ${lateDays} day${lateDays !== 1 ? 's' : ''} overdue.</p>
<p><strong>Cumulative late fee: $${cumulativeLateFee.toFixed(2)}</strong></p>
<p><strong>Total amount due: $${totalAmountDue.toFixed(2)}</strong></p>
${links ? `<p>Please return the vehicle as soon as possible or extend your booking here: <a href="${links.modifyUrl}">${links.modifyUrl}</a></p>` : '<p>Please return the vehicle as soon as possible.</p>'}
<p>Thank you,<br>Carsgidi Team</p>`;
        text = html.replace(/<[^>]+>/g, "");
      }
      
      await sendEmail({ 
        to: booking.customer.email, 
        subject, 
        html, 
        text 
      });
      console.log(`[TripMonitorEmail] Sent late return alert email to booking #${booking.id}`);
    }
    
    // Send SMS
    if (booking.customer?.phone && hasTwilioSmsConfig()) {
      const normalizedPhone = normalizePhone(booking.customer.phone);
      if (normalizedPhone) {
        let smsBody;
        
        if (smsTemplate) {
          // Use custom template
          smsBody = renderSmsTemplate(smsTemplate.body, extendedBooking, links);
        } else {
          // Default SMS
          smsBody = `Hi ${firstName}, your booking #${booking.id} is ${lateDays} day${lateDays !== 1 ? 's' : ''} overdue. Late fee: $${cumulativeLateFee.toFixed(2)}. Total due: $${totalAmountDue.toFixed(2)}. ${links ? `Extend: ${links.modifyUrl}` : 'Please return ASAP.'}`;
        }
        
        const client = getTwilioClient();
        await client.messages.create({
          to: normalizedPhone,
          from: process.env.TWILIO_FROM_NUMBER,
          body: smsBody,
        });
        console.log(`[TripMonitorEmail] Sent late return alert SMS to booking #${booking.id}`);
      }
    }
    
    await markLateReturnAlertSent(booking.id);
    return { success: true, bookingId: booking.id };
  } catch (error) {
    console.error(`[TripMonitorEmail] Failed to send late return alert for booking #${booking.id}:`, error);
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
    
    // Filter for overdue alerts that need late return notifications
    const overdueAlerts = alerts.filter(a => a.type === 'overdue' && !a.internal);
    
    const results = {
      extensionOffers: [],
      adminNotifications: [],
      lateReturnAlerts: [],
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
    
    // Process late return alerts (send email/SMS based on template)
    for (const alert of overdueAlerts) {
      // Check if we've already sent a late return alert for this booking
      const alreadySent = await hasLateReturnAlertMarker(alert.bookingId);
      if (!alreadySent) {
        // Fetch full booking data
        const booking = await bookingService.getBookingById(alert.bookingId);
        const result = await sendLateReturnAlert(booking, alert);
        results.lateReturnAlerts.push(result);
      }
    }
    
    console.log(`[TripMonitorEmail] Processed ${results.extensionOffers.length} extension offers, ${results.adminNotifications.length} admin notifications, ${results.lateReturnAlerts.length} late return alerts`);
    
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
  sendLateReturnAlert,
};
