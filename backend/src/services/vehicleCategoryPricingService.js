const prisma = require("../config/db");
const {
  ensureVehicleUsageSettingsForAllVehicles,
} = require("./vehicleUsageService");

const VEHICLE_CATEGORY_PRICING_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "VehicleCategoryPricing" (
    "category" TEXT NOT NULL PRIMARY KEY,
    "dailyRate" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

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
  await prisma.$executeRawUnsafe(VEHICLE_CATEGORY_PRICING_TABLE_SQL);

  for (const category of VALID_VEHICLE_CATEGORIES) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "VehicleCategoryPricing" (
          "category",
          "dailyRate",
          "updatedAt"
        )
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT("category") DO NOTHING
      `,
      category,
      DEFAULT_CATEGORY_RATES[category]
    );
  }
}

async function getVehicleCategoryPricing() {
  await ensureVehicleCategoryPricingTable();

  const rows = await prisma.$queryRawUnsafe(
    'SELECT "category", "dailyRate", "updatedAt" FROM "VehicleCategoryPricing"'
  );

  const map = normalizeCategoryRateMap();
  for (const row of Array.isArray(rows) ? rows : []) {
    const category = sanitizeVehicleCategory(row.category, "");
    if (!category) continue;
    map[category] = sanitizeCategoryRate(row.dailyRate, map[category]);
  }

  return {
    rates: map,
    categories: VALID_VEHICLE_CATEGORIES,
  };
}

async function syncVehicleRatesByCategory(rateMap = {}) {
  await ensureVehicleUsageSettingsForAllVehicles();

  await prisma.$executeRawUnsafe(
    `
      UPDATE "Vehicle"
      SET "dailyRate" = ?
      WHERE "id" IN (
        SELECT "vehicleId"
        FROM "VehicleUsageSettings"
        WHERE lower("category") = ?
      )
    `,
    sanitizeCategoryRate(rateMap.compact, DEFAULT_CATEGORY_RATES.compact),
    "compact"
  ).catch(() => null);

  await prisma.$executeRawUnsafe(
    `
      UPDATE "Vehicle"
      SET "dailyRate" = ?
      WHERE "id" IN (
        SELECT "vehicleId"
        FROM "VehicleUsageSettings"
        WHERE lower("category") = ?
      )
    `,
    sanitizeCategoryRate(rateMap.midsize, DEFAULT_CATEGORY_RATES.midsize),
    "midsize"
  ).catch(() => null);

  await prisma.$executeRawUnsafe(
    `
      UPDATE "Vehicle"
      SET "dailyRate" = ?
      WHERE "id" IN (
        SELECT "vehicleId"
        FROM "VehicleUsageSettings"
        WHERE lower("category") = ?
      )
    `,
    sanitizeCategoryRate(rateMap.suv, DEFAULT_CATEGORY_RATES.suv),
    "suv"
  ).catch(() => null);

  await prisma.$executeRawUnsafe(
    `
      UPDATE "Vehicle"
      SET "dailyRate" = ?
      WHERE "id" IN (
        SELECT "vehicleId"
        FROM "VehicleUsageSettings"
        WHERE lower("category") = ?
      )
    `,
    sanitizeCategoryRate(rateMap.luxury, DEFAULT_CATEGORY_RATES.luxury),
    "luxury"
  ).catch(() => null);
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
    await prisma.$executeRawUnsafe(
      `
        UPDATE "VehicleCategoryPricing"
        SET "dailyRate" = ?, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "category" = ?
      `,
      nextRates[category],
      category
    );
  }

  await syncVehicleRatesByCategory(nextRates);

  return {
    rates: nextRates,
    categories: VALID_VEHICLE_CATEGORIES,
  };
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
