// src/services/dynamicPricingService.js
const prisma = require("../config/db");

/**
 * Calculate the dynamic price for a vehicle rental
 * @param {number} vehicleId - The vehicle ID
 * @param {string|Date} pickupDatetime - Pickup date/time
 * @param {string|Date} returnDatetime - Return date/time
 * @returns {Promise<number>} - The calculated daily rate
 */
async function calculateDynamicPrice(vehicleId, pickupDatetime, returnDatetime) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: Number(vehicleId) },
    include: {
      pricingRules: {
        where: { isActive: true },
        orderBy: { priority: "desc" },
      },
    },
  });

  if (!vehicle) {
    throw new Error(`Vehicle with ID ${vehicleId} not found`);
  }

  // If flat pricing, return the daily rate
  if (vehicle.pricingType === "flat") {
    return vehicle.dailyRate;
  }

  const pickup = new Date(pickupDatetime);
  const returnDt = new Date(returnDatetime);
  
  // Calculate rental duration
  const durationMs = returnDt.getTime() - pickup.getTime();
  const hours = durationMs / (1000 * 60 * 60);
  const days = Math.ceil(hours / 24);

  // Determine base rate based on duration
  let baseRate = vehicle.dailyRate;

  if (hours < 24 && vehicle.hourlyRate) {
    // Hourly rate for short rentals
    baseRate = vehicle.hourlyRate * hours;
  } else if (days >= 30 && vehicle.monthlyRate) {
    // Monthly rate for long rentals
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    baseRate = (vehicle.monthlyRate * months) + (vehicle.dailyRate * remainingDays);
  } else if (days >= 7 && vehicle.weeklyRate) {
    // Weekly rate for medium rentals
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    baseRate = (vehicle.weeklyRate * weeks) + (vehicle.dailyRate * remainingDays);
  } else {
    // Daily rate
    baseRate = vehicle.dailyRate * days;
  }

  // Apply dynamic multipliers
  const multiplier = await calculatePricingMultiplier(
    vehicle,
    pickup,
    returnDt
  );

  return (baseRate / days) * multiplier; // Return per-day rate with multiplier
}

/**
 * Calculate the pricing multiplier based on rules and time
 * @param {Object} vehicle - The vehicle object with pricing rules
 * @param {Date} pickupDatetime - Pickup date/time
 * @param {Date} returnDatetime - Return date/time
 * @returns {Promise<number>} - The multiplier to apply
 */
async function calculatePricingMultiplier(vehicle, pickupDatetime, returnDatetime) {
  let multiplier = 1.0;

  // Check if it's a weekend
  const pickupDay = pickupDatetime.getDay();
  if (pickupDay === 0 || pickupDay === 6) {
    multiplier *= vehicle.weekendMultiplier || 1.0;
  }

  // Check time of day for peak/off-peak
  const pickupHour = pickupDatetime.getHours();
  if (pickupHour >= 17 && pickupHour <= 21) {
    // Peak hours (5 PM - 9 PM)
    multiplier *= vehicle.peakMultiplier || 1.0;
  } else if (pickupHour >= 0 && pickupHour <= 6) {
    // Off-peak hours (midnight - 6 AM)
    multiplier *= vehicle.offPeakMultiplier || 1.0;
  }

  // Apply pricing rules
  for (const rule of vehicle.pricingRules || []) {
    if (ruleApplies(rule, pickupDatetime, returnDatetime)) {
      multiplier *= rule.multiplier;
    }
  }

  return multiplier;
}

/**
 * Check if a pricing rule applies to the given date range
 * @param {Object} rule - The pricing rule
 * @param {Date} pickupDatetime - Pickup date/time
 * @param {Date} returnDatetime - Return date/time
 * @returns {boolean} - Whether the rule applies
 */
function ruleApplies(rule, pickupDatetime, returnDatetime) {
  // Check date range
  if (rule.startDate && new Date(rule.startDate) > pickupDatetime) {
    return false;
  }
  if (rule.endDate && new Date(rule.endDate) < pickupDatetime) {
    return false;
  }

  // Check day of week
  if (rule.daysOfWeek) {
    try {
      const daysArray = JSON.parse(rule.daysOfWeek);
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const pickupDayName = dayNames[pickupDatetime.getDay()];
      
      if (!daysArray.includes(pickupDayName)) {
        return false;
      }
    } catch (e) {
      console.error("Error parsing daysOfWeek:", e);
    }
  }

  // Check time range
  if (rule.startTime && rule.endTime) {
    const pickupTime = `${String(pickupDatetime.getHours()).padStart(2, "0")}:${String(pickupDatetime.getMinutes()).padStart(2, "0")}`;
    
    if (pickupTime < rule.startTime || pickupTime > rule.endTime) {
      return false;
    }
  }

  return true;
}

/**
 * Get all pricing rules for a vehicle
 * @param {number} vehicleId - The vehicle ID (null for global rules)
 * @returns {Promise<Array>} - Array of pricing rules
 */
async function getPricingRules(vehicleId = null) {
  const where = vehicleId ? { vehicleId: Number(vehicleId) } : { vehicleId: null };
  
  return prisma.pricingRule.findMany({
    where,
    orderBy: { priority: "desc" },
    include: {
      vehicle: {
        select: {
          id: true,
          make: true,
          model: true,
          plateNumber: true,
        },
      },
    },
  });
}

/**
 * Create a new pricing rule
 * @param {Object} data - The pricing rule data
 * @returns {Promise<Object>} - The created pricing rule
 */
async function createPricingRule(data) {
  return prisma.pricingRule.create({
    data: {
      vehicleId: data.vehicleId ? Number(data.vehicleId) : null,
      ruleType: data.ruleType,
      multiplier: Number(data.multiplier),
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      daysOfWeek: data.daysOfWeek || null,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      priority: data.priority || 0,
      description: data.description || null,
    },
  });
}

/**
 * Update a pricing rule
 * @param {number} id - The pricing rule ID
 * @param {Object} data - The updated data
 * @returns {Promise<Object>} - The updated pricing rule
 */
async function updatePricingRule(id, data) {
  const updateData = {};
  
  if (data.vehicleId !== undefined) updateData.vehicleId = data.vehicleId ? Number(data.vehicleId) : null;
  if (data.ruleType) updateData.ruleType = data.ruleType;
  if (data.multiplier !== undefined) updateData.multiplier = Number(data.multiplier);
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.daysOfWeek !== undefined) updateData.daysOfWeek = data.daysOfWeek;
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.description !== undefined) updateData.description = data.description;

  return prisma.pricingRule.update({
    where: { id: Number(id) },
    data: updateData,
  });
}

/**
 * Delete a pricing rule
 * @param {number} id - The pricing rule ID
 * @returns {Promise<Object>} - The deleted pricing rule
 */
async function deletePricingRule(id) {
  return prisma.pricingRule.delete({
    where: { id: Number(id) },
  });
}

/**
 * Update vehicle pricing configuration
 * @param {number} vehicleId - The vehicle ID
 * @param {Object} data - The pricing configuration
 * @returns {Promise<Object>} - The updated vehicle
 */
async function updateVehiclePricing(vehicleId, data) {
  const updateData = {};
  
  if (data.pricingType) updateData.pricingType = data.pricingType;
  if (data.dailyRate !== undefined) updateData.dailyRate = Number(data.dailyRate);
  if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate ? Number(data.hourlyRate) : null;
  if (data.weeklyRate !== undefined) updateData.weeklyRate = data.weeklyRate ? Number(data.weeklyRate) : null;
  if (data.monthlyRate !== undefined) updateData.monthlyRate = data.monthlyRate ? Number(data.monthlyRate) : null;
  if (data.peakMultiplier !== undefined) updateData.peakMultiplier = Number(data.peakMultiplier);
  if (data.offPeakMultiplier !== undefined) updateData.offPeakMultiplier = Number(data.offPeakMultiplier);
  if (data.weekendMultiplier !== undefined) updateData.weekendMultiplier = Number(data.weekendMultiplier);

  return prisma.vehicle.update({
    where: { id: Number(vehicleId) },
    data: updateData,
  });
}

module.exports = {
  calculateDynamicPrice,
  calculatePricingMultiplier,
  getPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  updateVehiclePricing,
};
