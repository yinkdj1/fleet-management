// src/controllers/paymentController.js
const {
  isStripeConfigured,
  createPaymentIntent,
  retrievePaymentIntent,
  getPublishableKey,
} = require('../services/stripePaymentService');

/**
 * Get payment configuration (publishable key, provider info)
 */
async function getPaymentConfig(req, res) {
  try {
    const stripeConfigured = isStripeConfigured();
    
    res.json({
      success: true,
      data: {
        provider: stripeConfigured ? 'stripe' : 'demo',
        stripePublishableKey: stripeConfigured ? getPublishableKey() : null,
        stripeConfigured,
      },
    });
  } catch (error) {
    console.error('Get payment config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment configuration',
    });
  }
}

/**
 * Create a payment intent for a booking
 */
async function createBookingPaymentIntent(req, res) {
  try {
    const { amount, bookingId, customerEmail, customerName } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
      });
    }

    if (!isStripeConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Stripe is not configured. Using demo payment mode.',
      });
    }

    const metadata = {
      bookingId: bookingId ? String(bookingId) : 'pending',
      customerEmail: customerEmail || '',
      customerName: customerName || '',
    };

    const paymentIntent = await createPaymentIntent({
      amount: Number(amount),
      currency: 'usd',
      metadata,
    });

    res.json({
      success: true,
      data: paymentIntent,
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment intent',
    });
  }
}

/**
 * Verify a payment intent status
 */
async function verifyPaymentIntent(req, res) {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required',
      });
    }

    if (!isStripeConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Stripe is not configured',
      });
    }

    const paymentIntent = await retrievePaymentIntent(paymentIntentId);

    res.json({
      success: true,
      data: paymentIntent,
    });
  } catch (error) {
    console.error('Verify payment intent error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment',
    });
  }
}

module.exports = {
  getPaymentConfig,
  createBookingPaymentIntent,
  verifyPaymentIntent,
};
