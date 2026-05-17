// src/routes/pricingRoutes.js
const express = require("express");
const router = express.Router();
const {
  getAllPricingRules,
  createNewPricingRule,
  updateExistingPricingRule,
  deleteExistingPricingRule,
  updateVehiclePricingConfig,
  calculatePrice,
} = require("../controllers/pricingController");
const { protect } = require("../middleware/authMiddleware");

// All pricing routes require authentication
router.use(protect);

// Get all pricing rules (optionally filtered by vehicleId)
// GET /api/pricing/rules?vehicleId=1
router.get("/rules", getAllPricingRules);

// Create a new pricing rule
// POST /api/pricing/rules
router.post("/rules", createNewPricingRule);

// Update a pricing rule
// PUT /api/pricing/rules/:id
router.put("/rules/:id", updateExistingPricingRule);

// Delete a pricing rule
// DELETE /api/pricing/rules/:id
router.delete("/rules/:id", deleteExistingPricingRule);

// Update vehicle pricing configuration
// PUT /api/pricing/vehicles/:id
router.put("/vehicles/:id", updateVehiclePricingConfig);

// Calculate dynamic price for a vehicle rental
// POST /api/pricing/calculate
router.post("/calculate", calculatePrice);

module.exports = router;
