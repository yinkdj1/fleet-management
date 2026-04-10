const express = require("express");

const {
  getPublicAvailableVehicles,
  getPublicCustomerByContact,
  getPublicGuestBooking,
  checkoutPublicGuestBooking,
  checkinPublicGuestBooking,
  getPublicPrecheckoutBooking,
  uploadPublicPrecheckoutDocument,
  getPublicManageBooking,
  modifyPublicManageBooking,
  cancelPublicManageBooking,
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
router.get("/customers/lookup", vehiclesRateLimiter, getPublicCustomerByContact);
router.get("/bookings/:id", vehiclesRateLimiter, getPublicGuestBooking);
router.get("/precheckout/:token", vehiclesRateLimiter, getPublicPrecheckoutBooking);
router.get("/manage/:token", vehiclesRateLimiter, getPublicManageBooking);
router.patch("/manage/:token/modify", reservationRateLimiter, modifyPublicManageBooking);
router.post("/manage/:token/cancel", reservationRateLimiter, cancelPublicManageBooking);
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
