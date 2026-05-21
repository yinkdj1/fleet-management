const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/reports
router.get("/", async (req, res, next) => {
  try {
    const [totalBookings, totalRevenue, totalCustomers, totalVehicles] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.aggregate({ _sum: { totalAmount: true } }),
      prisma.customer.count(),
      prisma.vehicle.count(),
    ]);

    res.json({
      success: true,
      data: {
        totalBookings,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalCustomers,
        totalVehicles,
      },
    });
  } catch (err) {
    console.error('[ReportsRoute] Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load report data', 
      details: err.message 
    });
  }
});

module.exports = router;
