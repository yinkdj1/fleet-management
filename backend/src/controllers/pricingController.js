// src/controllers/pricingController.js
const {
  getPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  updateVehiclePricing,
  calculateDynamicPrice,
} = require("../services/dynamicPricingService");

/**
 * Get all pricing rules (optionally filtered by vehicleId)
 */
async function getAllPricingRules(req, res, next) {
  try {
    const { vehicleId } = req.query;
    const rules = await getPricingRules(vehicleId ? Number(vehicleId) : null);
    res.json(rules);
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new pricing rule
 */
async function createNewPricingRule(req, res, next) {
  try {
    const rule = await createPricingRule(req.body);
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing pricing rule
 */
async function updateExistingPricingRule(req, res, next) {
  try {
    const { id } = req.params;
    const rule = await updatePricingRule(id, req.body);
    res.json(rule);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a pricing rule
 */
async function deleteExistingPricingRule(req, res, next) {
  try {
    const { id } = req.params;
    await deletePricingRule(id);
    res.json({ message: "Pricing rule deleted successfully" });
  } catch (error) {
    next(error);
  }
}

/**
 * Update vehicle pricing configuration
 */
async function updateVehiclePricingConfig(req, res, next) {
  try {
    const { id } = req.params;
    const vehicle = await updateVehiclePricing(id, req.body);
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
}

/**
 * Calculate dynamic price for a vehicle rental
 */
async function calculatePrice(req, res, next) {
  try {
    const { vehicleId, pickupDatetime, returnDatetime } = req.body;

    if (!vehicleId || !pickupDatetime || !returnDatetime) {
      return res.status(400).json({
        error: "vehicleId, pickupDatetime, and returnDatetime are required",
      });
    }

    const dailyRate = await calculateDynamicPrice(
      vehicleId,
      pickupDatetime,
      returnDatetime
    );

    res.json({
      vehicleId: Number(vehicleId),
      pickupDatetime,
      returnDatetime,
      dailyRate,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllPricingRules,
  createNewPricingRule,
  updateExistingPricingRule,
  deleteExistingPricingRule,
  updateVehiclePricingConfig,
  calculatePrice,
};
