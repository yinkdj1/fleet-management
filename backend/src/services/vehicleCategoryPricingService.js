const prisma = require("../config/db");
const {
  ensureVehicleUsageSettingsForAllVehicles,
} = require("./vehicleUsageService");

const DEFAULT_CATEGORY_RATES = {
  compact: 45,
  midsize: 55,
  suv: 65,
  luxury: 85,
};

const VALID_VEHICLE_CATEGORIES = Object.freeze([
  "compact",
  "midsize",
  "suv",
  "luxury",
]);

function roundToTwo(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function sanitizeVehicleCategory(value, fallback = "compact") {
  const normalized = String(value || "").trim().toLowerCase();
  if (VALID_VEHICLE_CATEGORIES.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function sanitizeCategoryRate(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, roundToTwo(parsed));
}

function normalizeCategoryRateMap(input = {}) {
  const next = {};
  for (const category of VALID_VEHICLE_CATEGORIES) {
    next[category] = sanitizeCategoryRate(
      input[category],
      DEFAULT_CATEGORY_RATES[category]
    );
  }
  return next;
}

async function ensureVehicleCategoryPricingTable() {
  // Seed default rows if missing
  for (const category of VALID_VEHICLE_CATEGORIES) {
    await prisma.vehicleCategoryPricing.upsert({
      where: { category },
      update: {},
      create: { category, dailyRate: DEFAULT_CATEGORY_RATES[category] },
    });
  }
}

async function getVehicleCategoryPricing() {
  await ensureVehicleCategoryPricingTable();

  const rows = await prisma.vehicleCategoryPricing.findMany();

  const map = normalizeCategoryRateMap();
  for (const row of rows) {
    const category = sanitizeVehicleCategory(row.category, "");
    if (!category) continue;
    map[category] = sanitizeCategoryRate(row.dailyRate, map[category]);
  }

  return { rates: map, categories: VALID_VEHICLE_CATEGORIES };
}

async function syncVehicleRatesByCategory(rateMap = {}) {
  await ensureVehicleUsageSettingsForAllVehicles();

  for (const category of VALID_VEHICLE_CATEGORIES) {
    const rate = sanitizeCategoryRate(rateMap[category], DEFAULT_CATEGORY_RATES[category]);
    await prisma.vehicle.updateMany({
      where: {
        usageSettings: { category: { equals: category, mode: "insensitive" } },
      },
      data: { dailyRate: rate },
    });
  }
}

async function updateVehicleCategoryPricing(input = {}) {
  await ensureVehicleCategoryPricingTable();

  const current = await getVehicleCategoryPricing();
  const nextRates = {
    compact: sanitizeCategoryRate(input.compact, current.rates.compact),
    midsize: sanitizeCategoryRate(input.midsize, current.rates.midsize),
    suv: sanitizeCategoryRate(input.suv, current.rates.suv),
    luxury: sanitizeCategoryRate(input.luxury, current.rates.luxury),
  };

  for (const category of VALID_VEHICLE_CATEGORIES) {
    await prisma.vehicleCategoryPricing.update({
      where: { category },
      data: { dailyRate: nextRates[category] },
    });
  }

  await syncVehicleRatesByCategory(nextRates);

  return { rates: nextRates, categories: VALID_VEHICLE_CATEGORIES };
}

function getRateForCategory(rates = {}, category = "compact") {
  const normalizedCategory = sanitizeVehicleCategory(category, "compact");
  return sanitizeCategoryRate(
    rates[normalizedCategory],
    DEFAULT_CATEGORY_RATES[normalizedCategory]
  );
}

module.exports = {
  DEFAULT_CATEGORY_RATES,
  VALID_VEHICLE_CATEGORIES,
  sanitizeVehicleCategory,
  getVehicleCategoryPricing,
  updateVehicleCategoryPricing,
  getRateForCategory,
  syncVehicleRatesByCategory,
};
