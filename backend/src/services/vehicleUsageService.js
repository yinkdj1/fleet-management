const prisma = require("../config/db");

const VALID_USAGE_TYPES = ["personal", "rideshare", "both"];
const VALID_VEHICLE_CATEGORIES = ["compact", "midsize", "suv", "luxury", "unassigned"];

function sanitizeVehicleCategory(value, fallback = "compact") {
  const normalized = String(value || "").trim().toLowerCase();
  if (VALID_VEHICLE_CATEGORIES.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

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
  // Allow Cloudinary URLs or server-generated upload paths
  if (!trimmed.startsWith("/uploads/") && !trimmed.startsWith("https://res.cloudinary.com/")) {
    return fallback;
  }
  return trimmed.slice(0, 1000);
}

async function ensureVehicleUsageTable() {
  // Table is managed by Prisma migrations — nothing to do here
}

async function ensureVehicleUsageSetting(vehicleId) {
  await prisma.vehicleUsageSettings.upsert({
    where: { vehicleId: Number(vehicleId) },
    update: {},
    create: {
      vehicleId: Number(vehicleId),
      category: "compact",
      usageType: "both",
      description: "",
      fuelType: "",
      transmission: "",
      passengers: 0,
      dailyMileage: 0,
      imageUrl: "",
    },
  });
}

async function ensureVehicleUsageSettingsForAllVehicles() {
  await ensureVehicleUsageTable();

  const vehicles = await prisma.vehicle.findMany({
    select: { id: true },
  });

  for (const vehicle of vehicles) {
    await ensureVehicleUsageSetting(vehicle.id);
  }
}

async function getVehicleProfileById(vehicleId) {
  const row = await prisma.vehicleUsageSettings.findUnique({
    where: { vehicleId: Number(vehicleId) },
  });
  return {
    category: sanitizeVehicleCategory(row?.category, "compact"),
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
  const currentProfile = await getVehicleProfileById(vehicleId);

  const data = {
    category: input.category !== undefined
      ? sanitizeVehicleCategory(input.category, currentProfile.category)
      : currentProfile.category,
    usageType: input.usageType !== undefined
      ? sanitizeUsageType(input.usageType, currentProfile.usageType)
      : currentProfile.usageType,
    description: input.description !== undefined
      ? sanitizeVehicleDescription(input.description, currentProfile.description)
      : currentProfile.description,
    fuelType: input.fuelType !== undefined
      ? sanitizeVehicleText(input.fuelType, currentProfile.fuelType)
      : currentProfile.fuelType,
    transmission: input.transmission !== undefined
      ? sanitizeVehicleText(input.transmission, currentProfile.transmission)
      : currentProfile.transmission,
    passengers: input.passengers !== undefined
      ? sanitizePassengers(input.passengers, currentProfile.passengers)
      : currentProfile.passengers,
    dailyMileage: input.dailyMileage !== undefined
      ? sanitizeDailyMileage(input.dailyMileage, currentProfile.dailyMileage)
      : currentProfile.dailyMileage,
    imageUrl: input.imageUrl !== undefined
      ? sanitizeImageUrl(input.imageUrl, currentProfile.imageUrl)
      : currentProfile.imageUrl,
  };

  await prisma.vehicleUsageSettings.upsert({
    where: { vehicleId: Number(vehicleId) },
    update: data,
    create: { vehicleId: Number(vehicleId), ...data },
  });

  return data;
}

async function getVehicleProfileMap(vehicleIds = []) {
  const normalizedIds = vehicleIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (normalizedIds.length === 0) return {};

  const rows = await prisma.vehicleUsageSettings.findMany({
    where: { vehicleId: { in: normalizedIds } },
  });

  const map = {};
  for (const row of rows) {
    map[Number(row.vehicleId)] = {
      category: sanitizeVehicleCategory(row.category, "compact"),
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
    category: profileMap[Number(vehicle.id)]?.category || "compact",
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
  sanitizeVehicleCategory,
  sanitizeVehicleDescription,
  sanitizeVehicleText,
  sanitizePassengers,
  sanitizeDailyMileage,
  sanitizeImageUrl,
  ensureVehicleUsageSetting,
  ensureVehicleUsageSettingsForAllVehicles,
  getVehicleProfileById,
  updateVehicleProfile,
  updateVehicleUsageType,
  attachVehicleProfile,
  attachUsageType,
};
