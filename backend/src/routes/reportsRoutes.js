const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const RANGE_DEFINITIONS = {
  "1m": { days: 30, label: "1 Month", type: "daily" },
  "3m": { days: 90, label: "3 Months", type: "weekly" },
  "6m": { days: 180, label: "6 Months", type: "weekly" },
  "1y": { days: 365, label: "1 Year", type: "monthly" },
};

function formatDayLabel(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekLabel(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthLabel(date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function buildRangeBuckets(rangeKey) {
  const now = new Date();
  const { days, type } = RANGE_DEFINITIONS[rangeKey];
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (type === "daily") {
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const bucketEnd = new Date(date);
      bucketEnd.setHours(23, 59, 59, 999);
      return {
        label: formatDayLabel(date),
        start: new Date(date),
        end: bucketEnd,
      };
    });
  }

  if (type === "weekly") {
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const bucketCount = Math.ceil(days / 7);
    return Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = new Date(start);
      bucketStart.setDate(start.getDate() + index * 7);
      bucketStart.setHours(0, 0, 0, 0);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketStart.getDate() + 6);
      bucketEnd.setHours(23, 59, 59, 999);
      return {
        label: formatWeekLabel(bucketStart),
        start: bucketStart,
        end: bucketEnd,
      };
    });
  }

  if (type === "monthly") {
    const buckets = [];
    const current = new Date(end);
    current.setDate(1);
    current.setHours(0, 0, 0, 0);

    for (let i = 11; i >= 0; i -= 1) {
      const bucketStart = new Date(current);
      bucketStart.setMonth(current.getMonth() - i);
      bucketStart.setHours(0, 0, 0, 0);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setMonth(bucketStart.getMonth() + 1);
      bucketEnd.setMilliseconds(-1);
      buckets.push({ label: formatMonthLabel(bucketStart), start: bucketStart, end: bucketEnd });
    }

    return buckets;
  }

  return [];
}

function initializeVehicleRow(vehicle) {
  return {
    vehicleId: vehicle.id,
    make: vehicle.make || "",
    model: vehicle.model || "",
    plateNumber: vehicle.plateNumber || "",
    dailyRate: Number(vehicle.dailyRate || 0),
    bookings: 0,
    revenue: 0,
    discountPercentage: 0,
  };
}

function initializeTrendDetail(label) {
  return {
    label,
    bookings: 0,
    revenue: 0,
    vehicleTable: [],
  };
}

function findBucketIndex(buckets, bookingDate) {
  return buckets.findIndex((bucket) => bookingDate >= bucket.start && bookingDate <= bucket.end);
}

router.get("/", async (req, res, next) => {
  try {
    const lookback = new Date();
    lookback.setDate(lookback.getDate() - 364);
    lookback.setHours(0, 0, 0, 0);

    const bookings = await prisma.booking.findMany({
      where: {
        pickupDatetime: {
          gte: lookback,
        },
      },
      include: {
        vehicle: true,
      },
    });

    const ranges = {};

    for (const rangeKey of Object.keys(RANGE_DEFINITIONS)) {
      const buckets = buildRangeBuckets(rangeKey);
      const vehicleMap = new Map();
      const trend = buckets.map((bucket) => ({ label: bucket.label, bookings: 0, revenue: 0 }));
      const trendDetails = buckets.map((bucket) => initializeTrendDetail(bucket.label));

      for (const booking of bookings) {
        const bookingDate = new Date(booking.pickupDatetime);
        const bucketIndex = findBucketIndex(buckets, bookingDate);
        if (bucketIndex < 0) continue;

        const revenue = Number(booking.totalAmount || 0);
        const vehicleId = booking.vehicleId;
        const vehicle = booking.vehicle;

        const vehicleRow = vehicleMap.has(vehicleId)
          ? vehicleMap.get(vehicleId)
          : initializeVehicleRow(vehicle);

        vehicleRow.bookings += 1;
        vehicleRow.revenue += revenue;
        vehicleMap.set(vehicleId, vehicleRow);

        const detailBucket = trendDetails[bucketIndex];
        detailBucket.bookings += 1;
        detailBucket.revenue += revenue;

        let detailVehicle = detailBucket.vehicleTable.find((row) => row.vehicleId === vehicleId);
        if (!detailVehicle) {
          detailVehicle = {
            vehicleId,
            make: vehicle.make || "",
            model: vehicle.model || "",
            plateNumber: vehicle.plateNumber || "",
            dailyRate: Number(vehicle.dailyRate || 0),
            bookingCount: 0,
            revenue: 0,
            discountPercentage: 0,
          };
          detailBucket.vehicleTable.push(detailVehicle);
        }
        detailVehicle.bookingCount += 1;
        detailVehicle.revenue += revenue;

        trend[bucketIndex].bookings += 1;
        trend[bucketIndex].revenue += revenue;
      }

      const vehicleTable = Array.from(vehicleMap.values());
      const totalBookings = trend.reduce((sum, item) => sum + item.bookings, 0);
      const totalRevenue = trend.reduce((sum, item) => sum + item.revenue, 0);

      ranges[rangeKey] = {
        label: RANGE_DEFINITIONS[rangeKey].label,
        totalBookings,
        totalRevenue,
        vehicleTable,
        trend,
        trendDetails,
      };
    }

    res.json({ success: true, data: { ranges } });
  } catch (err) {
    console.error("[ReportsRoute] Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to load report data",
      details: err.message,
    });
  }
});

module.exports = router;
