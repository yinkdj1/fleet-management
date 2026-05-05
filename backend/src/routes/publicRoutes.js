const express = require("express");

const {
  getPublicAvailableVehicles,
  getPublicVehicles,
  getPublicCustomerByContact,
  getPublicGuestBooking,
  checkoutPublicGuestBooking,
  checkinPublicGuestBooking,
  extendPublicGuestBooking,
  getPublicPrecheckoutBooking,
  uploadPublicPrecheckoutDocument,
  getPublicManageBooking,
  modifyPublicManageBooking,
  cancelPublicManageBooking,
  getPublicDiscountSettings,
  getPublicGeocodeSearch,
  getPublicGeocodeReverse,
  createTestPayment,
  createPublicReservation,
} = require("../controllers/publicController");
const upload = require("../middleware/uploadMiddleware");
const {
  createRateLimiter,
  honeypotGuard,
} = require("../middleware/publicProtectionMiddleware");

const { createIdentitySession } = require("../services/stripeIdentityService");

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
router.get("/vehicles", vehiclesRateLimiter, getPublicVehicles);
router.get("/discount-settings", vehiclesRateLimiter, getPublicDiscountSettings);
router.get("/customers/lookup", vehiclesRateLimiter, getPublicCustomerByContact);
router.get("/bookings/:id", vehiclesRateLimiter, getPublicGuestBooking);
router.get("/precheckout/:token", vehiclesRateLimiter, getPublicPrecheckoutBooking);
router.get("/manage/:token", vehiclesRateLimiter, getPublicManageBooking);
router.patch("/manage/:token/modify", reservationRateLimiter, modifyPublicManageBooking);
router.post("/manage/:token/cancel", reservationRateLimiter, cancelPublicManageBooking);
// Stripe Identity — create verification session for a precheckout booking
router.post("/precheckout/:token/identity-session", reservationRateLimiter, async (req, res, next) => {
  try {
    const { getPrecheckoutBookingByToken } = require("../services/bookingService");
    const booking = await getPrecheckoutBookingByToken(req.params.token);
    const returnUrl = req.body.returnUrl || `${process.env.FRONTEND_URL || "https://fleet-management-bay-ten.vercel.app"}/guest-precheckout/${req.params.token}?identity=done`;
    const result = await createIdentitySession(booking.id, returnUrl);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/precheckout/:token/upload",
  reservationRateLimiter,
  upload.single("photo"),
  uploadPublicPrecheckoutDocument
);
router.post(
  "/bookings/:id/checkout",
  reservationRateLimiter,
  upload.array("photos", 20),
  checkoutPublicGuestBooking
);
router.post(
  "/bookings/:id/checkin",
  reservationRateLimiter,
  upload.array("photos", 20),
  checkinPublicGuestBooking
);
router.post(
  "/bookings/:id/extend",
  reservationRateLimiter,
  extendPublicGuestBooking
);
router.get("/geocode/search", vehiclesRateLimiter, getPublicGeocodeSearch);
router.get("/geocode/reverse", vehiclesRateLimiter, getPublicGeocodeReverse);
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
