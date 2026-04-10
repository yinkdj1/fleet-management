const express = require("express");
const router = express.Router();

const {
  getMaintenanceRecords,
  getMaintenanceRecordById,
  createMaintenanceRecord,
  completeMaintenanceRecord
} = require("../controllers/maintenanceController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getMaintenanceRecords);
router.get("/:id", protect, getMaintenanceRecordById);
router.post("/", protect, createMaintenanceRecord);
router.patch("/:id/complete", protect, completeMaintenanceRecord);

module.exports = router;