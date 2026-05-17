// src/services/stripePaymentService.js
const Stripe = require('stripe');

let stripeClient = null;

function getStripeClient() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);
}

/**
 * Create a Stripe PaymentIntent for the booking
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Amount in dollars (will be converted to cents)
 * @param {string} params.currency - Currency code (default: 'usd')
 * @param {Object} params.metadata - Additional metadata for the payment
 * @returns {Promise<Object>} PaymentIntent object
 */
async function createPaymentIntent({ amount, currency = 'usd', metadata = {} }) {
  const stripe = getStripeClient();
  
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
  }

  // Convert dollars to cents (Stripe expects amounts in cents)
  const amountInCents = Math.round(amount * 100);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error('Stripe PaymentIntent creation failed:', error);
    throw new Error(`Payment initialization failed: ${error.message}`);
  }
}

/**
 * Confirm a payment with card details
 * @param {Object} params - Payment confirmation parameters
 * @param {string} params.paymentIntentId - The PaymentIntent ID
 * @param {Object} params.paymentMethod - Payment method details
 * @returns {Promise<Object>} Confirmed payment details
 */
async function confirmPayment({ paymentIntentId, paymentMethod }) {
  const stripe = getStripeClient();
  
  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethod,
    });

    return {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100, // Convert cents back to dollars
      currency: paymentIntent.currency,
    };
  } catch (error) {
    console.error('Stripe payment confirmation failed:', error);
    throw new Error(`Payment confirmation failed: ${error.message}`);
  }
}

/**
 * Retrieve a PaymentIntent by ID
 * @param {string} paymentIntentId - The PaymentIntent ID
 * @returns {Promise<Object>} PaymentIntent details
 */
async function retrievePaymentIntent(paymentIntentId) {
  const stripe = getStripeClient();
  
  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      paymentMethod: paymentIntent.payment_method,
      metadata: paymentIntent.metadata,
    };
  } catch (error) {
    console.error('Stripe PaymentIntent retrieval failed:', error);
    throw new Error(`Payment retrieval failed: ${error.message}`);
  }
}

/**
 * Create a Stripe SetupIntent for saving payment methods
 * @param {Object} params - Setup parameters
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} SetupIntent object
 */
async function createSetupIntent({ metadata = {} } = {}) {
  const stripe = getStripeClient();
  
  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      status: setupIntent.status,
    };
  } catch (error) {
    console.error('Stripe SetupIntent creation failed:', error);
    throw new Error(`Setup initialization failed: ${error.message}`);
  }
}

/**
 * Get Stripe publishable key
 * @returns {string} Publishable key
 */
function getPublishableKey() {
  return process.env.STRIPE_PUBLISHABLE_KEY || '';
}

module.exports = {
  isStripeConfigured,
  createPaymentIntent,
  confirmPayment,
  retrievePaymentIntent,
  createSetupIntent,
  getPublishableKey,
};
