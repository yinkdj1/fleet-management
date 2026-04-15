const prisma = require("../config/db");

const VEHICLE_USAGE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "VehicleUsageSettings" (
    "vehicleId" INTEGER NOT NULL PRIMARY KEY,
    "usageType" TEXT NOT NULL DEFAULT 'both',
    "description" TEXT NOT NULL DEFAULT '',
    "fuelType" TEXT NOT NULL DEFAULT '',
    "transmission" TEXT NOT NULL DEFAULT '',
    "passengers" INTEGER NOT NULL DEFAULT 0,
    "dailyMileage" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const VALID_USAGE_TYPES = ["personal", "rideshare", "both"];

function sanitizeUsageType(value, fallback = "both") {
  const normalized = String(value || "").trim().toLowerCase();
  if (VALID_USAGE_TYPES.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function sanitizeVehicleDescription(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim().replace(/\s+/g, " ").slice(0, 400);
}

function sanitizeVehicleText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function sanitizePassengers(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(99, Math.floor(parsed)));
}

function sanitizeDailyMileage(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(5000, Math.floor(parsed)));
}

function sanitizeImageUrl(value, fallback = "") {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }
  const trimmed = value.trim();
  // Only allow server-generated upload paths
  if (!trimmed.startsWith("/uploads/")) {
    return fallback;
  }
  return trimmed.slice(0, 500);
}

async function ensureVehicleUsageTable() {
  await prisma.$executeRawUnsafe(VEHICLE_USAGE_TABLE_SQL);
  await prisma.$executeRawUnsafe(
    "ALTER TABLE \"VehicleUsageSettings\" ADD COLUMN \"description\" TEXT NOT NULL DEFAULT ''"
  ).catch(() => null);
  await prisma.$executeRawUnsafe(
    "ALTER TABLE \"VehicleUsageSettings\" ADD COLUMN \"fuelType\" TEXT NOT NULL DEFAULT ''"
  ).catch(() => null);
  await prisma.$executeRawUnsafe(
    "ALTER TABLE \"VehicleUsageSettings\" ADD COLUMN \"transmission\" TEXT NOT NULL DEFAULT ''"
  ).catch(() => null);
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "VehicleUsageSettings" ADD COLUMN "passengers" INTEGER NOT NULL DEFAULT 0'
  ).catch(() => null);
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "VehicleUsageSettings" ADD COLUMN "dailyMileage" INTEGER NOT NULL DEFAULT 0'
  ).catch(() => null);
  await prisma.$executeRawUnsafe(
    "ALTER TABLE \"VehicleUsageSettings\" ADD COLUMN \"imageUrl\" TEXT NOT NULL DEFAULT ''"
  ).catch(() => null);
}

async function ensureVehicleUsageSetting(vehicleId) {
  await ensureVehicleUsageTable();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "VehicleUsageSettings" (
        "vehicleId",
        "usageType",
        "description",
        "fuelType",
        "transmission",
        "passengers",
        "dailyMileage",
        "imageUrl",
        "updatedAt"
      )
      VALUES (?, 'both', '', '', '', 0, 0, '', CURRENT_TIMESTAMP)
      ON CONFLICT("vehicleId") DO NOTHING
    `,
    Number(vehicleId)
  );
}

async function getVehicleProfileById(vehicleId) {
  await ensureVehicleUsageTable();

  const rows = await prisma.$queryRawUnsafe(
    'SELECT "vehicleId", "usageType", "description", "fuelType", "transmission", "passengers", "dailyMileage", "imageUrl" FROM "VehicleUsageSettings" WHERE "vehicleId" = ? LIMIT 1',
    Number(vehicleId)
  );

  const row = Array.isArray(rows) ? rows[0] : null;
  return {
    usageType: sanitizeUsageType(row?.usageType, "both"),
    description: sanitizeVehicleDescription(row?.description, ""),
    fuelType: sanitizeVehicleText(row?.fuelType, ""),
    transmission: sanitizeVehicleText(row?.transmission, ""),
    passengers: sanitizePassengers(row?.passengers, 0),
    dailyMileage: sanitizeDailyMileage(row?.dailyMileage, 0),
    imageUrl: sanitizeImageUrl(row?.imageUrl, ""),
  };
}

async function updateVehicleProfile(vehicleId, input = {}) {
  await ensureVehicleUsageTable();

  const currentProfile = await getVehicleProfileById(vehicleId);
  const nextUsageType =
    input.usageType !== undefined
      ? sanitizeUsageType(input.usageType, currentProfile.usageType)
      : currentProfile.usageType;
  const nextDescription =
    input.description !== undefined
      ? sanitizeVehicleDescription(input.description, currentProfile.description)
      : currentProfile.description;
  const nextFuelType =
    input.fuelType !== undefined
      ? sanitizeVehicleText(input.fuelType, currentProfile.fuelType)
      : currentProfile.fuelType;
  const nextTransmission =
    input.transmission !== undefined
      ? sanitizeVehicleText(input.transmission, currentProfile.transmission)
      : currentProfile.transmission;
  const nextPassengers =
    input.passengers !== undefined
      ? sanitizePassengers(input.passengers, currentProfile.passengers)
      : currentProfile.passengers;
  const nextDailyMileage =
    input.dailyMileage !== undefined
      ? sanitizeDailyMileage(input.dailyMileage, currentProfile.dailyMileage)
      : currentProfile.dailyMileage;
  const nextImageUrl =
    input.imageUrl !== undefined
      ? sanitizeImageUrl(input.imageUrl, currentProfile.imageUrl)
      : currentProfile.imageUrl;

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "VehicleUsageSettings" (
        "vehicleId",
        "usageType",
        "description",
        "fuelType",
        "transmission",
        "passengers",
        "dailyMileage",
        "imageUrl",
        "updatedAt"
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT("vehicleId") DO UPDATE SET
        "usageType" = excluded."usageType",
        "description" = excluded."description",
        "fuelType" = excluded."fuelType",
        "transmission" = excluded."transmission",
        "passengers" = excluded."passengers",
        "dailyMileage" = excluded."dailyMileage",
        "imageUrl" = excluded."imageUrl",
        "updatedAt" = CURRENT_TIMESTAMP
    `,
    Number(vehicleId),
    nextUsageType,
    nextDescription,
    nextFuelType,
    nextTransmission,
    nextPassengers,
    nextDailyMileage,
    nextImageUrl
  );

  return {
    usageType: nextUsageType,
    description: nextDescription,
    fuelType: nextFuelType,
    transmission: nextTransmission,
    passengers: nextPassengers,
    dailyMileage: nextDailyMileage,
    imageUrl: nextImageUrl,
  };
}

async function getVehicleProfileMap(vehicleIds = []) {
  await ensureVehicleUsageTable();

  const normalizedIds = vehicleIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (normalizedIds.length === 0) {
    return {};
  }

  const placeholders = normalizedIds.map(() => "?").join(",");
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "vehicleId", "usageType", "description", "fuelType", "transmission", "passengers", "dailyMileage", "imageUrl" FROM "VehicleUsageSettings" WHERE "vehicleId" IN (${placeholders})`,
    ...normalizedIds
  );

  const map = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    map[Number(row.vehicleId)] = {
      usageType: sanitizeUsageType(row.usageType, "both"),
      description: sanitizeVehicleDescription(row.description, ""),
      fuelType: sanitizeVehicleText(row.fuelType, ""),
      transmission: sanitizeVehicleText(row.transmission, ""),
      passengers: sanitizePassengers(row.passengers, 0),
      dailyMileage: sanitizeDailyMileage(row.dailyMileage, 0),
      imageUrl: sanitizeImageUrl(row.imageUrl, ""),
    };
  }

  return map;
}

async function attachVehicleProfile(vehicles = []) {
  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return vehicles;
  }

  const vehicleIds = vehicles.map((vehicle) => vehicle.id);
  const profileMap = await getVehicleProfileMap(vehicleIds);

  return vehicles.map((vehicle) => ({
    ...vehicle,
    usageType: profileMap[Number(vehicle.id)]?.usageType || "both",
    description: profileMap[Number(vehicle.id)]?.description || "",
    fuelType: profileMap[Number(vehicle.id)]?.fuelType || "",
    transmission: profileMap[Number(vehicle.id)]?.transmission || "",
    passengers: profileMap[Number(vehicle.id)]?.passengers || 0,
    dailyMileage: profileMap[Number(vehicle.id)]?.dailyMileage || 0,
    imageUrl: profileMap[Number(vehicle.id)]?.imageUrl || "",
  }));
}

async function updateVehicleUsageType(vehicleId, usageType) {
  const profile = await updateVehicleProfile(vehicleId, { usageType });
  return profile.usageType;
}

async function attachUsageType(vehicles = []) {
  return attachVehicleProfile(vehicles);
}

module.exports = {
  sanitizeUsageType,
  sanitizeVehicleDescription,
  sanitizeVehicleText,
  sanitizePassengers,
  sanitizeDailyMileage,
  sanitizeImageUrl,
  ensureVehicleUsageSetting,
  updateVehicleProfile,
  updateVehicleUsageType,
  attachVehicleProfile,
  attachUsageType,
};
