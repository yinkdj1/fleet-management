const express = require("express");
const router = express.Router();

const {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  checkVehicleAvailability,
  getAvailableVehicles
} = require("../controllers/vehicleController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getVehicles);
router.get("/availability", protect, checkVehicleAvailability);
router.get("/available", protect, getAvailableVehicles);
router.get("/:id", protect, getVehicleById);
router.post("/", protect, createVehicle);
router.put("/:id", protect, updateVehicle);
router.delete("/:id", protect, deleteVehicle);

module.exports = router;