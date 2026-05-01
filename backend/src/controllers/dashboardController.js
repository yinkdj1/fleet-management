const prisma = require("../config/db");
const { getDiscountSettings, updateDiscountSettings } = require("../services/discountSettingsService");

async function getDiscountSettingsHandler(req, res, next) {
  try {
    const settings = await getDiscountSettings();
    res.json({ data: settings });
  } catch (error) {
    next(error);
  }
}

async function updateDiscountSettingsHandler(req, res, next) {
  try {
    const updated = await updateDiscountSettings(req.body);
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

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
  getDiscountSettingsHandler,
  updateDiscountSettingsHandler,
};
