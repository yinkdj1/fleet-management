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
} = require("../controllers/bookingController");

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

// ✅ photo upload routes
router.post("/:id/checkout", protect, upload.array("photos", 20), checkoutBooking);
router.post("/:id/checkin", protect, upload.array("photos", 20), checkinBooking);

module.exports = router;