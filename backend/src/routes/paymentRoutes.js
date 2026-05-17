// src/routes/paymentRoutes.js
const express = require('express');
const {
  getPaymentConfig,
  createBookingPaymentIntent,
  verifyPaymentIntent,
} = require('../controllers/paymentController');

const router = express.Router();

// Public routes (no authentication required)
router.get('/config', getPaymentConfig);
router.post('/create-intent', createBookingPaymentIntent);
router.get('/verify/:paymentIntentId', verifyPaymentIntent);

module.exports = router;
