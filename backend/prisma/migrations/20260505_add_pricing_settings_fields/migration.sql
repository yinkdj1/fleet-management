-- AlterTable: add missing pricing columns to PricingSettings
ALTER TABLE "PricingSettings"
  ADD COLUMN IF NOT EXISTS "taxPercentage" DOUBLE PRECISION NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS "servicePlatformFeePerDay" DOUBLE PRECISION NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS "protectionPlanFeePerDay" DOUBLE PRECISION NOT NULL DEFAULT 0;
