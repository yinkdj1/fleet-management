const prisma = require("../config/db");
const { getDiscountSettings } = require("../services/discountSettingsService");

function calculateRentalDays(pickupDatetime, returnDatetime) {
  const pickup = new Date(pickupDatetime);
  const dropoff = new Date(returnDatetime);

  if (Number.isNaN(pickup.getTime()) || Number.isNaN(dropoff.getTime())) {
    return 0;
  }

  const diffMs = dropoff.getTime() - pickup.getTime();

  if (diffMs <= 0) {
    return 0;
  }

  return Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 1);
}

function getBookingDiscountPercent(days, tiers = []) {
  const sortedTiers = [...tiers]
    .map((tier) => ({
      minDays: Number(tier?.minDays || 0),
      percentage: Number(tier?.percentage || 0),
    }))
    .filter((tier) => Number.isFinite(tier.minDays) && tier.minDays > 0)
    .sort((left, right) => right.minDays - left.minDays);

  const matchedTier = sortedTiers.find(
    (tier) => days >= tier.minDays && tier.percentage > 0
  );

  return matchedTier?.percentage || 0;
}

function buildVehicleBreakdown(list, discountTiers) {
  const map = {};

  for (const booking of list) {
    const rentalDays = calculateRentalDays(
      booking.pickupDatetime,
      booking.returnDatetime
    );
    const discountPercentage = getBookingDiscountPercent(rentalDays, discountTiers);

    if (!map[booking.vehicleId]) {
      map[booking.vehicleId] = {
        vehicleId: booking.vehicleId,
        make: booking.vehicle?.make || "",
        model: booking.vehicle?.model || "",
        plateNumber: booking.vehicle?.plateNumber || "",
        dailyRate: Number(booking.vehicle?.dailyRate || 0),
        bookingCount: 0,
        revenue: 0,
        maxDiscountPercentage: 0,
      };
    }

    map[booking.vehicleId].bookingCount += 1;
    map[booking.vehicleId].revenue += Number(booking.totalAmount || 0);
    map[booking.vehicleId].maxDiscountPercentage = Math.max(
      map[booking.vehicleId].maxDiscountPercentage,
      discountPercentage
    );
  }

  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

async function getReports(req, res, next) {
  try {
    const now = new Date();
    const discountSettings = await getDiscountSettings();

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 30);
    monthStart.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Fetch all non-cancelled bookings from the last 6 months in one query
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
        status: { notIn: ["cancelled"] },
      },
      select: {
        id: true,
        vehicleId: true,
        totalAmount: true,
        createdAt: true,
        pickupDatetime: true,
        returnDatetime: true,
        status: true,
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            plateNumber: true,
            dailyRate: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    function sum(list) {
      return list.reduce((s, b) => s + (b.totalAmount || 0), 0);
    }

    const weeklyBookings = bookings.filter(
      (b) => new Date(b.createdAt) >= weekStart
    );
    const monthlyBookings = bookings.filter(
      (b) => new Date(b.createdAt) >= monthStart
    );

    const weeklyByVehicle = buildVehicleBreakdown(weeklyBookings, discountSettings.tiers);
    const monthlyByVehicle = buildVehicleBreakdown(monthlyBookings, discountSettings.tiers);

    // Merged vehicle table (all vehicles active in the last 30 days, with weekly + monthly figures)
    const weeklyMap = Object.fromEntries(
      weeklyByVehicle.map((v) => [v.vehicleId, v])
    );
    const monthlyMap = Object.fromEntries(
      monthlyByVehicle.map((v) => [v.vehicleId, v])
    );
    const allVehicleIds = [
      ...new Set(monthlyBookings.map((b) => b.vehicleId)),
    ];

    const vehicleTable = allVehicleIds
      .map((vid) => {
        const base = monthlyMap[vid] || weeklyMap[vid];
        return {
          vehicleId: vid,
          make: base.make,
          model: base.model,
          plateNumber: base.plateNumber,
          dailyRate: Number(base.dailyRate || 0),
          weekly: {
            bookings: weeklyMap[vid]?.bookingCount || 0,
            revenue: weeklyMap[vid]?.revenue || 0,
            discountPercentage: weeklyMap[vid]?.maxDiscountPercentage || 0,
          },
          monthly: {
            bookings: monthlyMap[vid]?.bookingCount || 0,
            revenue: monthlyMap[vid]?.revenue || 0,
            discountPercentage: monthlyMap[vid]?.maxDiscountPercentage || 0,
          },
        };
      })
      .sort((a, b) => b.monthly.revenue - a.monthly.revenue);

    // Weekly trend: last 8 weeks (7-day buckets, oldest first)
    const weeklyTrend = [];
    const weeklyTrendDetails = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - (i + 1) * 7);
      start.setHours(0, 0, 0, 0);

      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);

      const label = end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      const bucket = bookings.filter((b) => {
        const d = new Date(b.createdAt);
        return d >= start && d <= end;
      });

      const perVehicle = buildVehicleBreakdown(bucket, discountSettings.tiers);

      weeklyTrend.push({
        label,
        bookings: bucket.length,
        revenue: sum(bucket),
      });
      weeklyTrendDetails.push({
        label,
        bookings: bucket.length,
        revenue: sum(bucket),
        vehicleTable: perVehicle.map((vehicle) => ({
          vehicleId: vehicle.vehicleId,
          make: vehicle.make,
          model: vehicle.model,
          plateNumber: vehicle.plateNumber,
          dailyRate: Number(vehicle.dailyRate || 0),
          bookingCount: Number(vehicle.bookingCount || 0),
          revenue: Number(vehicle.revenue || 0),
          discountPercentage: Number(vehicle.maxDiscountPercentage || 0),
        })),
      });
    }

    // Monthly trend: last 6 calendar months (oldest first)
    const monthlyTrend = [];
    const monthlyTrendDetails = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      const bucket = bookings.filter((b) => {
        const bd = new Date(b.createdAt);
        return bd.getFullYear() === year && bd.getMonth() === month;
      });

      const perVehicle = buildVehicleBreakdown(bucket, discountSettings.tiers);

      monthlyTrend.push({
        label,
        bookings: bucket.length,
        revenue: sum(bucket),
      });
      monthlyTrendDetails.push({
        label,
        bookings: bucket.length,
        revenue: sum(bucket),
        vehicleTable: perVehicle.map((vehicle) => ({
          vehicleId: vehicle.vehicleId,
          make: vehicle.make,
          model: vehicle.model,
          plateNumber: vehicle.plateNumber,
          dailyRate: Number(vehicle.dailyRate || 0),
          bookingCount: Number(vehicle.bookingCount || 0),
          revenue: Number(vehicle.revenue || 0),
          discountPercentage: Number(vehicle.maxDiscountPercentage || 0),
        })),
      });
    }

    res.json({
      data: {
        weekly: {
          totalBookings: weeklyBookings.length,
          totalRevenue: sum(weeklyBookings),
          byVehicle: weeklyByVehicle,
        },
        monthly: {
          totalBookings: monthlyBookings.length,
          totalRevenue: sum(monthlyBookings),
          byVehicle: monthlyByVehicle,
        },
        vehicleTable,
        weeklyTrend,
        weeklyTrendDetails,
        monthlyTrend,
        monthlyTrendDetails,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getReports };
