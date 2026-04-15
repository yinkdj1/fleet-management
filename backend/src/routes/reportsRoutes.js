const express = require("express");
const router = express.Router();

const { getReports } = require("../controllers/reportsController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getReports);

module.exports = router;
