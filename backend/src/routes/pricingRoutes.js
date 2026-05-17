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
const { authenticate, authorize } = require("../middleware/authMiddleware");

// All pricing routes require authentication
router.use(authenticate);

// Get all pricing rules (optionally filtered by vehicleId)
// GET /api/pricing/rules?vehicleId=1
router.get("/rules", authorize(["admin", "staff"]), getAllPricingRules);

// Create a new pricing rule
// POST /api/pricing/rules
router.post("/rules", authorize(["admin"]), createNewPricingRule);

// Update a pricing rule
// PUT /api/pricing/rules/:id
router.put("/rules/:id", authorize(["admin"]), updateExistingPricingRule);

// Delete a pricing rule
// DELETE /api/pricing/rules/:id
router.delete("/rules/:id", authorize(["admin"]), deleteExistingPricingRule);

// Update vehicle pricing configuration
// PUT /api/pricing/vehicles/:id
router.put("/vehicles/:id", authorize(["admin"]), updateVehiclePricingConfig);

// Calculate dynamic price for a vehicle rental
// POST /api/pricing/calculate
router.post("/calculate", authorize(["admin", "staff"]), calculatePrice);

module.exports = router;
