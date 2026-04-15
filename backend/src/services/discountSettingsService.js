const prisma = require("../config/db");

const SETTINGS_ROW_ID = 1;
const PRICING_SETTINGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "PricingSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "threeDayPercentage" REAL NOT NULL DEFAULT 5,
    "sevenDayPercentage" REAL NOT NULL DEFAULT 10,
    "fourteenDayPercentage" REAL NOT NULL DEFAULT 15,
    "pickupLocation" TEXT NOT NULL DEFAULT 'Main Office',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const DEFAULT_DISCOUNT_SETTINGS = {
  threeDayPercentage: 5,
  sevenDayPercentage: 10,
  fourteenDayPercentage: 15,
  pickupLocation: "Main Office",
};

function roundToTwo(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function sanitizePercentage(value, fallback) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(roundToTwo(parsedValue), 0), 100);
}

function sanitizePickupLocation(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed || fallback;
}

function formatDiscountSettings(record) {
  const settings = {
    threeDayPercentage: sanitizePercentage(
      record?.threeDayPercentage,
      DEFAULT_DISCOUNT_SETTINGS.threeDayPercentage
    ),
    sevenDayPercentage: sanitizePercentage(
      record?.sevenDayPercentage,
      DEFAULT_DISCOUNT_SETTINGS.sevenDayPercentage
    ),
    fourteenDayPercentage: sanitizePercentage(
      record?.fourteenDayPercentage,
      DEFAULT_DISCOUNT_SETTINGS.fourteenDayPercentage
    ),
    pickupLocation: sanitizePickupLocation(
      record?.pickupLocation,
      DEFAULT_DISCOUNT_SETTINGS.pickupLocation
    ),
    updatedAt: record?.updatedAt || null,
  };

  return {
    ...settings,
    tiers: [
      { minDays: 14, percentage: settings.fourteenDayPercentage },
      { minDays: 7, percentage: settings.sevenDayPercentage },
      { minDays: 3, percentage: settings.threeDayPercentage },
    ],
  };
}

async function ensureDiscountSettingsRecord() {
  await prisma.$executeRawUnsafe(PRICING_SETTINGS_TABLE_SQL);
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "PricingSettings" ADD COLUMN "pickupLocation" TEXT NOT NULL DEFAULT \'Main Office\''
  ).catch(() => null);

  const existingRows = await prisma.$queryRawUnsafe(
    'SELECT * FROM "PricingSettings" WHERE "id" = ? LIMIT 1',
    SETTINGS_ROW_ID
  );
  const existingRecord = Array.isArray(existingRows) ? existingRows[0] : null;

  if (existingRecord) {
    return existingRecord;
  }

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "PricingSettings" (
        "id",
        "threeDayPercentage",
        "sevenDayPercentage",
        "fourteenDayPercentage",
        "pickupLocation",
        "createdAt",
        "updatedAt"
      )
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    SETTINGS_ROW_ID,
    DEFAULT_DISCOUNT_SETTINGS.threeDayPercentage,
    DEFAULT_DISCOUNT_SETTINGS.sevenDayPercentage,
    DEFAULT_DISCOUNT_SETTINGS.fourteenDayPercentage,
    DEFAULT_DISCOUNT_SETTINGS.pickupLocation
  );

  const insertedRows = await prisma.$queryRawUnsafe(
    'SELECT * FROM "PricingSettings" WHERE "id" = ? LIMIT 1',
    SETTINGS_ROW_ID
  );

  return Array.isArray(insertedRows) ? insertedRows[0] : null;
}

async function getDiscountSettings() {
  const record = await ensureDiscountSettingsRecord();
  return formatDiscountSettings(record);
}

async function updateDiscountSettings(input = {}) {
  const currentRecord = await ensureDiscountSettingsRecord();

  const nextThreeDayPercentage = sanitizePercentage(
    input.threeDayPercentage,
    currentRecord.threeDayPercentage
  );
  const nextSevenDayPercentage = sanitizePercentage(
    input.sevenDayPercentage,
    currentRecord.sevenDayPercentage
  );
  const nextFourteenDayPercentage = sanitizePercentage(
    input.fourteenDayPercentage,
    currentRecord.fourteenDayPercentage
  );
  const nextPickupLocation = sanitizePickupLocation(
    input.pickupLocation,
    currentRecord.pickupLocation
  );

  await prisma.$executeRawUnsafe(
    `
      UPDATE "PricingSettings"
      SET
        "threeDayPercentage" = ?,
        "sevenDayPercentage" = ?,
        "fourteenDayPercentage" = ?,
        "pickupLocation" = ?,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ?
    `,
    nextThreeDayPercentage,
    nextSevenDayPercentage,
    nextFourteenDayPercentage,
    nextPickupLocation,
    SETTINGS_ROW_ID
  );

  const updatedRows = await prisma.$queryRawUnsafe(
    'SELECT * FROM "PricingSettings" WHERE "id" = ? LIMIT 1',
    SETTINGS_ROW_ID
  );
  const updatedRecord = Array.isArray(updatedRows) ? updatedRows[0] : null;

  return formatDiscountSettings(updatedRecord);
}

module.exports = {
  DEFAULT_DISCOUNT_SETTINGS,
  getDiscountSettings,
  updateDiscountSettings,
};