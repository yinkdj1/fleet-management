const prisma = require("../config/db");

async function getDashboardSummary(req, res, next) {
  try {
    const [totalCustomers, totalVehicles, totalBookings, bookingStatusGroups, revenueResult] =
      await Promise.all([
        prisma.customer.count(),
        prisma.vehicle.count(),
        prisma.booking.count(),
        prisma.booking.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
        prisma.booking.aggregate({ _sum: { totalAmount: true } }),
      ]);

    const statusCounts = bookingStatusGroups.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {});

    const summary = {
      totalCustomers,
      totalVehicles,
      totalBookings,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      bookingStatusCounts: statusCounts,
    };

    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardSummary,
};
