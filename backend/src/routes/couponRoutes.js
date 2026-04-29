const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");

// Create a coupon
router.post("/", couponController.createCoupon);
// Get all coupons
router.get("/", couponController.getCoupons);
// Send a coupon via email or SMS
router.post("/send", couponController.sendCoupon);
// Delete a coupon
router.delete("/:id", couponController.deleteCoupon);

module.exports = router;
