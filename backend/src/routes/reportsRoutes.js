const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function formatDayLabel(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildDateRange(days) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const labels = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    labels.push({
      date,
      label: formatDayLabel(date),
      start: new Date(date),
      end: new Date(date),
    });
  }

  labels.forEach((item) => {
    item.start.setHours(0, 0, 0, 0);
    item.end.setHours(23, 59, 59, 999);
  });

  return labels;
}

function initializeVehicleRow(vehicle) {
  return {
    vehicleId: vehicle.id,
    make: vehicle.make || "",
    model: vehicle.model || "",
    plateNumber: vehicle.plateNumber || "",
    dailyRate: Number(vehicle.dailyRate || 0),
    weekly: { bookings: 0, revenue: 0, discountPercentage: 0 },
    monthly: { bookings: 0, revenue: 0, discountPercentage: 0 },
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

// GET /api/reports
router.get("/", async (req, res, next) => {
  try {
    const WEEK_DAYS = 7;
    const MONTH_DAYS = 30;
    const monthlyRange = buildDateRange(MONTH_DAYS);
    const weeklyRange = monthlyRange.slice(MONTH_DAYS - WEEK_DAYS);
    const startDate = monthlyRange[0].start;

    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
        status: {
          not: "cancelled",
        },
      },
      include: {
        vehicle: true,
      },
    });

    const vehicleMap = new Map();

    const weeklyTrend = weeklyRange.map((item) => ({
      label: item.label,
      bookings: 0,
      revenue: 0,
    }));
    const weeklyTrendDetails = weeklyRange.map((item) => initializeTrendDetail(item.label));

    const monthlyTrend = monthlyRange.map((item) => ({
      label: item.label,
      bookings: 0,
      revenue: 0,
    }));
    const monthlyTrendDetails = monthlyRange.map((item) => initializeTrendDetail(item.label));

    let totalWeeklyBookings = 0;
    let totalWeeklyRevenue = 0;
    let totalMonthlyBookings = 0;
    let totalMonthlyRevenue = 0;

    for (const booking of bookings) {
      const createdAt = new Date(booking.createdAt);
      const revenue = Number(booking.totalAmount || 0);
      const vehicleId = booking.vehicleId;
      const vehicle = booking.vehicle;

      if (!vehicleMap.has(vehicleId)) {
        vehicleMap.set(vehicleId, initializeVehicleRow(vehicle));
      }

      const vehicleRow = vehicleMap.get(vehicleId);

      const dayIndex = monthlyRange.findIndex(
        (item) => createdAt >= item.start && createdAt <= item.end
      );

      if (dayIndex >= 0) {
        monthlyTrend[dayIndex].bookings += 1;
        monthlyTrend[dayIndex].revenue += revenue;
        monthlyTrendDetails[dayIndex].bookings += 1;
        monthlyTrendDetails[dayIndex].revenue += revenue;

        const detailVehicle = monthlyTrendDetails[dayIndex].vehicleTable.find(
          (row) => row.vehicleId === vehicleId
        );

        if (detailVehicle) {
          detailVehicle.bookingCount += 1;
          detailVehicle.revenue += revenue;
        } else {
          monthlyTrendDetails[dayIndex].vehicleTable.push({
            vehicleId,
            make: vehicle.make || "",
            model: vehicle.model || "",
            plateNumber: vehicle.plateNumber || "",
            dailyRate: Number(vehicle.dailyRate || 0),
            bookingCount: 1,
            revenue,
            discountPercentage: 0,
          });
        }
      }

      const weeklyDayIndex = weeklyRange.findIndex(
        (item) => createdAt >= item.start && createdAt <= item.end
      );

      if (weeklyDayIndex >= 0) {
        weeklyTrend[weeklyDayIndex].bookings += 1;
        weeklyTrend[weeklyDayIndex].revenue += revenue;
        weeklyTrendDetails[weeklyDayIndex].bookings += 1;
        weeklyTrendDetails[weeklyDayIndex].revenue += revenue;

        const detailVehicle = weeklyTrendDetails[weeklyDayIndex].vehicleTable.find(
          (row) => row.vehicleId === vehicleId
        );

        if (detailVehicle) {
          detailVehicle.bookingCount += 1;
          detailVehicle.revenue += revenue;
        } else {
          weeklyTrendDetails[weeklyDayIndex].vehicleTable.push({
            vehicleId,
            make: vehicle.make || "",
            model: vehicle.model || "",
            plateNumber: vehicle.plateNumber || "",
            dailyRate: Number(vehicle.dailyRate || 0),
            bookingCount: 1,
            revenue,
            discountPercentage: 0,
          });
        }
      }

      if (dayIndex >= 0) {
        vehicleRow.monthly.bookings += 1;
        vehicleRow.monthly.revenue += revenue;
      }
      if (weeklyDayIndex >= 0) {
        vehicleRow.weekly.bookings += 1;
        vehicleRow.weekly.revenue += revenue;
      }
    }

    totalWeeklyBookings = weeklyTrend.reduce((sum, item) => sum + item.bookings, 0);
    totalWeeklyRevenue = weeklyTrend.reduce((sum, item) => sum + item.revenue, 0);
    totalMonthlyBookings = monthlyTrend.reduce((sum, item) => sum + item.bookings, 0);
    totalMonthlyRevenue = monthlyTrend.reduce((sum, item) => sum + item.revenue, 0);

    const vehicleTable = Array.from(vehicleMap.values());

    res.json({
      success: true,
      data: {
        weekly: {
          totalBookings: totalWeeklyBookings,
          totalRevenue: totalWeeklyRevenue,
        },
        monthly: {
          totalBookings: totalMonthlyBookings,
          totalRevenue: totalMonthlyRevenue,
        },
        vehicleTable,
        weeklyTrend,
        weeklyTrendDetails,
        monthlyTrend,
        monthlyTrendDetails,
      },
    });
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
