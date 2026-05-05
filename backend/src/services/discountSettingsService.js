const prisma = require("../config/db");

const SETTINGS_ROW_ID = 1;

const DEFAULT_DISCOUNT_SETTINGS = {
  threeDayPercentage: 5,
  sevenDayPercentage: 10,
  fourteenDayPercentage: 15,
  depositAmount: 100,
  taxPercentage: 7,
  servicePlatformFeePerDay: 15,
  protectionPlanFeePerDay: 0,
  pickupLocation: "Main Office",
};

function roundToTwo(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function sanitizePercentage(value, fallback) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return fallback;
  return Math.min(Math.max(roundToTwo(parsedValue), 0), 100);
}

function sanitizePickupLocation(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed || fallback;
}

function sanitizeDepositAmount(value, fallback) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return fallback;
  return Math.max(roundToTwo(parsedValue), 0);
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
    depositAmount: sanitizeDepositAmount(
      record?.depositAmount,
      DEFAULT_DISCOUNT_SETTINGS.depositAmount
    ),
    taxPercentage: sanitizePercentage(
      record?.taxPercentage,
      DEFAULT_DISCOUNT_SETTINGS.taxPercentage
    ),
    servicePlatformFeePerDay: sanitizeDepositAmount(
      record?.servicePlatformFeePerDay,
      DEFAULT_DISCOUNT_SETTINGS.servicePlatformFeePerDay
    ),
    protectionPlanFeePerDay: sanitizeDepositAmount(
      record?.protectionPlanFeePerDay,
      DEFAULT_DISCOUNT_SETTINGS.protectionPlanFeePerDay
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
  return prisma.pricingSettings.upsert({
    where: { id: SETTINGS_ROW_ID },
    update: {},
    create: {
      id: SETTINGS_ROW_ID,
      ...DEFAULT_DISCOUNT_SETTINGS,
    },
  });
}

async function getDiscountSettings() {
  const record = await ensureDiscountSettingsRecord();
  return formatDiscountSettings(record);
}

async function updateDiscountSettings(input = {}) {
  const current = await ensureDiscountSettingsRecord();

  const updated = await prisma.pricingSettings.update({
    where: { id: SETTINGS_ROW_ID },
    data: {
      threeDayPercentage: sanitizePercentage(
        input.threeDayPercentage,
        current.threeDayPercentage
      ),
      sevenDayPercentage: sanitizePercentage(
        input.sevenDayPercentage,
        current.sevenDayPercentage
      ),
      fourteenDayPercentage: sanitizePercentage(
        input.fourteenDayPercentage,
        current.fourteenDayPercentage
      ),
      depositAmount: sanitizeDepositAmount(
        input.depositAmount,
        current.depositAmount
      ),
      taxPercentage: sanitizePercentage(
        input.taxPercentage,
        current.taxPercentage
      ),
      servicePlatformFeePerDay: sanitizeDepositAmount(
        input.servicePlatformFeePerDay,
        current.servicePlatformFeePerDay
      ),
      protectionPlanFeePerDay: sanitizeDepositAmount(
        input.protectionPlanFeePerDay,
        current.protectionPlanFeePerDay
      ),
      pickupLocation: sanitizePickupLocation(
        input.pickupLocation,
        current.pickupLocation
      ),
    },
  });

  return formatDiscountSettings(updated);
}

module.exports = {
  DEFAULT_DISCOUNT_SETTINGS,
  getDiscountSettings,
  updateDiscountSettings,
};