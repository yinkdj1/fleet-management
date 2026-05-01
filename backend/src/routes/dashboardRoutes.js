const express = require("express");
const router = express.Router();

const { getDashboardSummary, getDiscountSettingsHandler, updateDiscountSettingsHandler } = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getDashboardSummary);
router.get("/discount-settings", protect, getDiscountSettingsHandler);
router.put("/discount-settings", protect, updateDiscountSettingsHandler);

module.exports = router;