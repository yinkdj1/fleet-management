const prisma = require("../config/db");
const bookingService = require("../services/bookingService");

async function getVehicles(req, res, next) {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
    const where = {};

    if (status) {
      if (status === "available") {
        where.NOT = {
          status: { in: ["maintenance", "out_of_service"] },
        };
      } else {
        where.status = status;
      }
    }

    if (search) {
      const term = String(search);
      where.OR = [
        { vin: { contains: term, mode: "insensitive" } },
        { plateNumber: { contains: term, mode: "insensitive" } },
        { make: { contains: term, mode: "insensitive" } },
        { model: { contains: term, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
      }),
      prisma.vehicle.count({ where }),
    ]);

    res.json({
      data,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getVehicleById(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: Number(req.params.id) },
      include: { bookings: true, maintenanceRecords: true },
    });

    if (!vehicle) {
      const error = new Error("Vehicle not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({ data: vehicle });
  } catch (error) {
    next(error);
  }
}

async function createVehicle(req, res, next) {
  try {
    const { vin, plateNumber, make, model, year, color, mileage, dailyRate, status } = req.body;

    if (!vin || !plateNumber || !make || !model || !year || !dailyRate) {
      const error = new Error("vin, plateNumber, make, model, year, and dailyRate are required");
      error.statusCode = 400;
      throw error;
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        vin,
        plateNumber,
        make,
        model,
        year: Number(year),
        color: color || null,
        mileage: mileage !== undefined ? Number(mileage) : 0,
        dailyRate: Number(dailyRate),
        status: status || "available",
      },
    });

    res.status(201).json({ data: vehicle });
  } catch (error) {
    if (error.code === "P2002") {
      error.statusCode = 400;
      error.message = "Duplicate vehicle VIN or plate number exists";
    }
    next(error);
  }
}

async function updateVehicle(req, res, next) {
  try {
    const { vin, plateNumber, make, model, year, color, mileage, dailyRate, status } = req.body;

    const vehicle = await prisma.vehicle.update({
      where: { id: Number(req.params.id) },
      data: {
        vin,
        plateNumber,
        make,
        model,
        year: year !== undefined ? Number(year) : undefined,
        color: color !== undefined ? color : undefined,
        mileage: mileage !== undefined ? Number(mileage) : undefined,
        dailyRate: dailyRate !== undefined ? Number(dailyRate) : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    res.json({ data: vehicle });
  } catch (error) {
    if (error.code === "P2002") {
      error.statusCode = 400;
      error.message = "Duplicate vehicle VIN or plate number exists";
    }
    next(error);
  }
}

async function deleteVehicle(req, res, next) {
  try {
    await prisma.vehicle.delete({
      where: { id: Number(req.params.id) },
    });
    res.status(204).end();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 404;
      error.message = "Vehicle not found";
    }
    next(error);
  }
}

async function checkVehicleAvailability(req, res, next) {
  try {
    const { vehicleId, pickupDatetime, returnDatetime } = req.query;

    await bookingService.checkVehicleAvailability(vehicleId, pickupDatetime, returnDatetime);

    res.json({ data: { available: true } });
  } catch (error) {
    next(error);
  }
}

async function getAvailableVehicles(req, res, next) {
  try {
    const pickupInput = req.query.pickupDatetime || req.query.pickupDate || req.query.startDate;
    const returnInput = req.query.returnDatetime || req.query.returnDate || req.query.endDate;

    const parseDateInput = (value, useEndOfDay = false) => {
      if (value === undefined || value === null || String(value).trim() === "") {
        return null;
      }

      const normalized = String(value).trim();
      const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

      if (dateOnlyPattern.test(normalized)) {
        return new Date(
          useEndOfDay
            ? `${normalized}T23:59:59.999Z`
            : `${normalized}T00:00:00.000Z`
        );
      }

      const parsed = new Date(normalized);

      if (Number.isNaN(parsed.getTime())) {
        const error = new Error("Invalid pickup or return date format");
        error.statusCode = 400;
        throw error;
      }

      return parsed;
    };

    const pickupDatetime = parseDateInput(pickupInput, false);
    const returnDatetime = parseDateInput(returnInput, true);

    const where = {
      NOT: {
        status: { in: ["maintenance", "out_of_service"] },
      },
    };

    if (pickupDatetime && returnDatetime) {
      where.bookings = {
        none: {
          status: { in: ["reserved", "active"] },
          pickupDatetime: { lt: returnDatetime },
          returnDatetime: { gt: pickupDatetime },
        },
      };
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const availableVehicles = vehicles.map((vehicle) => ({
      ...vehicle,
      currentStatus: vehicle.status,
      status: "available",
    }));

    res.json({ data: availableVehicles });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  checkVehicleAvailability,
  getAvailableVehicles,
};
