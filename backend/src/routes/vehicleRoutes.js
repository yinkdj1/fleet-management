const express = require("express");
const router = express.Router();

const {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  checkVehicleAvailability,
  getAvailableVehicles,
  uploadVehicleImage,
} = require("../controllers/vehicleController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.get("/", protect, getVehicles);
router.get("/availability", protect, checkVehicleAvailability);
router.get("/available", protect, getAvailableVehicles);
router.get("/:id", protect, getVehicleById);
router.post("/", protect, createVehicle);
router.post("/:id/image", protect, upload.single("image"), uploadVehicleImage);
router.put("/:id", protect, updateVehicle);
router.delete("/:id", protect, deleteVehicle);

module.exports = router;