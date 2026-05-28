const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");

const {
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  rescheduleBooking,
  changeBookingStatus,
  checkinBooking,
  checkoutBooking,
  createGuestPrecheckoutLink,
} = require("../controllers/bookingController");

const {
  chargeLateFee,
  skipLateFee,
  chargeExtraDayFee,
} = require("../controllers/lateFeeController");

const { protect } = require("../middleware/authMiddleware");

// list + detail
router.get("/", protect, getBookings);
router.get("/:id", protect, getBookingById);

// create + update
router.post("/", protect, createBooking);
router.patch("/:id", protect, updateBooking);

// workflow actions
router.patch("/:id/status", protect, changeBookingStatus);
router.patch("/:id/reschedule", protect, rescheduleBooking);
router.post("/:id/precheckout-link", protect, createGuestPrecheckoutLink);

// delete booking
router.delete("/:id", protect, require("../controllers/bookingController").deleteBooking);

// ✅ photo upload routes
router.post("/:id/checkout", protect, upload.array("photos", 20), checkoutBooking);
router.post("/:id/checkin", protect, upload.array("photos", 20), checkinBooking);

// Late fee management
router.post("/:id/charge-late-fee", protect, chargeLateFee);
router.post("/:id/skip-late-fee", protect, skipLateFee);
router.post("/:id/charge-extra-day-fee", protect, chargeExtraDayFee);

module.exports = router;
