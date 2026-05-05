-- CreateTable: VehicleUsageSettings
CREATE TABLE IF NOT EXISTS "VehicleUsageSettings" (
  "vehicleId"    INTEGER NOT NULL,
  "category"     TEXT NOT NULL DEFAULT 'compact',
  "usageType"    TEXT NOT NULL DEFAULT 'both',
  "description"  TEXT NOT NULL DEFAULT '',
  "fuelType"     TEXT NOT NULL DEFAULT '',
  "transmission" TEXT NOT NULL DEFAULT '',
  "passengers"   INTEGER NOT NULL DEFAULT 0,
  "dailyMileage" INTEGER NOT NULL DEFAULT 0,
  "imageUrl"     TEXT NOT NULL DEFAULT '',
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "VehicleUsageSettings_pkey" PRIMARY KEY ("vehicleId")
);

-- AddForeignKey (safe — skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VehicleUsageSettings_vehicleId_fkey'
  ) THEN
    ALTER TABLE "VehicleUsageSettings"
      ADD CONSTRAINT "VehicleUsageSettings_vehicleId_fkey"
      FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: VehicleCategoryPricing
CREATE TABLE IF NOT EXISTS "VehicleCategoryPricing" (
  "category"  TEXT NOT NULL,
  "dailyRate" DOUBLE PRECISION NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "VehicleCategoryPricing_pkey" PRIMARY KEY ("category")
);

-- Seed default category rates (skip if already present)
INSERT INTO "VehicleCategoryPricing" ("category", "dailyRate", "updatedAt")
VALUES
  ('compact', 45, NOW()),
  ('midsize', 55, NOW()),
  ('suv',     65, NOW()),
  ('luxury',  85, NOW())
ON CONFLICT ("category") DO NOTHING;
