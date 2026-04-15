const express = require("express");
const router = express.Router();

const {
	getDashboardSummary,
	getDashboardDiscountSettings,
	updateDashboardDiscountSettings,
} = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getDashboardSummary);
router.get("/discount-settings", protect, getDashboardDiscountSettings);
router.put("/discount-settings", protect, updateDashboardDiscountSettings);

module.exports = router;