const prisma = require('../config/db');

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const err = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
    err.statusCode = 500;
    throw err;
  }
  return require('stripe')(key);
}

async function handleStripeWebhook(rawBody, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    const err = new Error('STRIPE_WEBHOOK_SECRET is not set.');
    err.statusCode = 500;
    throw err;
  }

  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const error = new Error(`Webhook signature verification failed: ${err.message}`);
    error.statusCode = 400;
    throw error;
  }

  // Handle relevant events
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      try {
        // Mark booking as paid
        await prisma.booking.update({
          where: { id: Number(bookingId) },
          data: { paymentStatus: 'paid' },
        });

        // Store session document for audit
        await prisma.document.create({
          data: {
            bookingId: Number(bookingId),
            documentType: 'stripe_checkout_session',
            fileUrl: session.id,
          },
        });

        console.log(`[StripeWebhook] Booking #${bookingId} marked as paid (session ${session.id})`);
      } catch (err) {
        console.error('[StripeWebhook] Failed to mark booking paid:', err?.message || err);
        // Do not throw; respond received true to avoid retries for now
      }
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const bookingId = pi.metadata?.bookingId;
    if (bookingId) {
      try {
        await prisma.booking.update({ where: { id: Number(bookingId) }, data: { paymentStatus: 'paid' } });
        console.log(`[StripeWebhook] PaymentIntent succeeded — Booking #${bookingId} marked paid`);
      } catch (err) {
        console.error('[StripeWebhook] Failed to update booking from payment_intent:', err?.message || err);
      }
    }
  }

  return { received: true };
}

module.exports = { handleStripeWebhook };
