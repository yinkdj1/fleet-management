const prisma = require("../config/db");

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const err = new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
    err.statusCode = 500;
    throw err;
  }
  return require("stripe")(key);
}

function isStripeIdentityEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

async function upsertVerifiedIdentityMarker(bookingId, sessionId) {
  await prisma.document.upsert({
    where: {
      id: (await prisma.document.findFirst({
        where: {
          bookingId: Number(bookingId),
          documentType: "stripe_identity_verified",
        },
        select: { id: true },
      }))?.id ?? -1,
    },
    update: { fileUrl: sessionId },
    create: {
      bookingId: Number(bookingId),
      documentType: "stripe_identity_verified",
      fileUrl: sessionId,
    },
  });
}

/**
 * Create a Stripe Identity VerificationSession for a precheckout booking.
 * Returns { clientSecret, sessionId } to the frontend.
 */
async function createIdentitySession(bookingId, returnUrl) {
  const stripe = getStripe();

  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    options: {
      document: {
        allowed_types: ["driving_license", "id_card", "passport"],
        require_id_number: false,
        require_live_capture: true,
        require_matching_selfie: true,
      },
    },
    metadata: { bookingId: String(bookingId) },
    return_url: returnUrl,
  });

  // Store the session ID against the booking so the webhook can match it
  await prisma.document.create({
    data: {
      bookingId: Number(bookingId),
      documentType: "stripe_identity_session",
      fileUrl: session.id,
    },
  });

  return {
    clientSecret: session.client_secret,
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Handle Stripe Identity webhook events.
 * Marks the booking as identity-verified when Stripe confirms.
 */
async function handleIdentityWebhook(rawBody, signature) {
  const webhookSecret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    const err = new Error("STRIPE_IDENTITY_WEBHOOK_SECRET is not set.");
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

  if (event.type === "identity.verification_session.verified") {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      await upsertVerifiedIdentityMarker(bookingId, session.id);

      console.log(`[StripeIdentity] Booking #${bookingId} identity verified — session ${session.id}`);
    }
  }

  if (event.type === "identity.verification_session.requires_input") {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;
    console.warn(`[StripeIdentity] Booking #${bookingId} identity verification requires input — ${session.last_error?.reason}`);
  }

  return { received: true };
}

/**
 * Check if a booking has a verified Stripe Identity session.
 */
async function isBookingIdentityVerified(bookingId) {
  if (!isStripeIdentityEnabled()) {
    return true;
  }

  const verifiedDoc = await prisma.document.findFirst({
    where: {
      bookingId: Number(bookingId),
      documentType: "stripe_identity_verified",
    },
  });

  if (verifiedDoc) {
    return true;
  }

  const latestSessionDoc = await prisma.document.findFirst({
    where: {
      bookingId: Number(bookingId),
      documentType: "stripe_identity_session",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!latestSessionDoc?.fileUrl) {
    return false;
  }

  try {
    const stripe = getStripe();
    const session = await stripe.identity.verificationSessions.retrieve(latestSessionDoc.fileUrl);

    if (session?.status === "verified") {
      await upsertVerifiedIdentityMarker(bookingId, session.id);
      return true;
    }
  } catch (error) {
    console.warn(
      `[StripeIdentity] Failed to verify live session status for booking #${bookingId}:`,
      error?.message || error
    );
  }

  return false;
}

module.exports = {
  createIdentitySession,
  handleIdentityWebhook,
  isBookingIdentityVerified,
  isStripeIdentityEnabled,
};
