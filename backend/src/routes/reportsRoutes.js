const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/reports
router.get("/", async (req, res, next) => {
  try {
    const [totalBookings, totalRevenue, totalCustomers, totalVehicles] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.aggregate({ _sum: { total: true } }),
      prisma.customer.count(),
      prisma.vehicle.count(),
    ]);

    res.json({
      data: {
        totalBookings,
        totalRevenue: totalRevenue._sum.total || 0,
        totalCustomers,
        totalVehicles,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
