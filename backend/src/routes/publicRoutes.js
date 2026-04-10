const express = require("express");

const {
  getPublicAvailableVehicles,
  createTestPayment,
  createPublicReservation,
} = require("../controllers/publicController");
const {
  createRateLimiter,
  honeypotGuard,
} = require("../middleware/publicProtectionMiddleware");

const router = express.Router();

const vehiclesRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keySuffix: "public-vehicles",
});

const reservationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keySuffix: "public-reservations",
});

const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keySuffix: "public-payments",
});

router.get("/vehicles/available", vehiclesRateLimiter, getPublicAvailableVehicles);
router.post(
  "/payments/test-charge",
  paymentRateLimiter,
  honeypotGuard,
  createTestPayment
);
router.post(
  "/reservations",
  reservationRateLimiter,
  honeypotGuard,
  createPublicReservation
);

module.exports = router;
