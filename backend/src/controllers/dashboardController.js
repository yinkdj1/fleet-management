const prisma = require("../config/db");
const {
  getDiscountSettings,
  updateDiscountSettings,
} = require("../services/discountSettingsService");

async function getDashboardSummary(req, res, next) {
  try {
    const [
      totalCustomers,
      totalVehicles,
      totalBookings,
      bookingStatusGroups,
      revenueResult,
      vehicleStatusGroups,
    ] =
      await Promise.all([
        prisma.customer.count(),
        prisma.vehicle.count(),
        prisma.booking.count(),
        prisma.booking.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
        prisma.booking.aggregate({ _sum: { totalAmount: true } }),
        prisma.vehicle.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
      ]);

    const statusCounts = bookingStatusGroups.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {});

    const vehicleStatusCounts = vehicleStatusGroups.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {});

    const summary = {
      totalCustomers,
      totalVehicles,
      totalBookings,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      availableVehicles: vehicleStatusCounts.available || 0,
      rentedVehicles: vehicleStatusCounts.rented || 0,
      maintenanceVehicles:
        (vehicleStatusCounts.maintenance || 0) +
        (vehicleStatusCounts.out_of_service || 0),
      activeBookings: statusCounts.active || 0,
      reservedBookings: statusCounts.reserved || 0,
      completedBookings: statusCounts.completed || 0,
      bookingStatusCounts: statusCounts,
      vehicleStatusCounts,
    };

    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
}

async function getDashboardDiscountSettings(req, res, next) {
  try {
    const settings = await getDiscountSettings();
    res.json({ data: settings });
  } catch (error) {
    next(error);
  }
}

async function updateDashboardDiscountSettings(req, res, next) {
  try {
    const settings = await updateDiscountSettings(req.body || {});
    res.json({ data: settings, message: "Discount settings updated" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardSummary,
  getDashboardDiscountSettings,
  updateDashboardDiscountSettings,
};
