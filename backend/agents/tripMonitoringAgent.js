// Trip Monitoring Agent
// This agent monitors trips, sends notifications, and alerts admin/guests.

const { sendSMS } = require("../src/services/smsService");
const { sendEmail: _sendEmail } = require("../src/services/emailService");

const trips = [];

// Placeholder: Replace with DB fetch
function fetchAllTrips() {
  return trips;
}

function sendEmail(to, subject, message) {
  return _sendEmail({ to, subject, text: message, html: `<p>${message}</p>` });
}

function scheduleNotifications() {
  const now = new Date();
  fetchAllTrips().forEach(trip => {
    const pickup = new Date(trip.pickupTime);
    const dropoff = new Date(trip.dropoffTime);
    const midway = new Date((pickup.getTime() + dropoff.getTime()) / 2);
    // Guest: Check-in at pickup
    if (now < pickup && pickup - now < 1000 * 60 * 10) {
      sendSMS(trip.guestPhone, `It's time to pick up your car! Please check in.`);
      sendEmail(trip.guestEmail, 'Car Pickup Reminder', `It's time to pick up your car! Please check in.`);
    }
    // Admin: 1hr before pickup
    if (now < pickup && pickup - now < 1000 * 60 * 60 + 1000 * 60 * 10 && pickup - now > 1000 * 60 * 50) {
      sendEmail('admin@carsgidi.com', 'Upcoming Pickup', `Guest ${trip.guestName} is picking up car in 1 hour.`);
    }
    // Guest: Midway check-in
    if (now > pickup && now < dropoff && Math.abs(now - midway) < 1000 * 60 * 10) {
      sendSMS(trip.guestPhone, `Hope your trip is going well! If you need to extend, reply or visit your account.`);
      sendEmail(trip.guestEmail, 'Trip Check-in', `Hope your trip is going well! If you need to extend, reply or visit your account.`);
    }
    // Guest: Thank you at drop-off
    if (now < dropoff && dropoff - now < 1000 * 60 * 10) {
      sendSMS(trip.guestPhone, `Thank you for using Carsgidi! We hope you enjoyed your trip.`);
      sendEmail(trip.guestEmail, 'Thank You', `Thank you for using Carsgidi! We hope you enjoyed your trip.`);
    }
    // Late return alert
    if (now > dropoff && !trip.checkedIn) {
      sendEmail('admin@carsgidi.com', 'Late Return Alert', `Trip for guest ${trip.guestName} is late for return.`);
    }
  });
}

// Run every 5 minutes
setInterval(scheduleNotifications, 1000 * 60 * 5);

module.exports = { scheduleNotifications };
