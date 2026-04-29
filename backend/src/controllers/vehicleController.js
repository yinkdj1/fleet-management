const prisma = require("../config/db");
const bookingService = require("../services/bookingService");
const {
  sanitizeUsageType,
  sanitizeVehicleCategory,
  ensureVehicleUsageSetting,
  sanitizeVehicleDescription,
  sanitizeVehicleText,
  sanitizePassengers,
  sanitizeDailyMileage,
  getVehicleProfileById,
  updateVehicleProfile,
  attachVehicleProfile,
} = require("../services/vehicleUsageService");
const {
  getVehicleCategoryPricing,
  updateVehicleCategoryPricing,
  getRateForCategory,
} = require("../services/vehicleCategoryPricingService");

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

    const dataWithUsage = await attachVehicleProfile(data);

    res.json({
      data: dataWithUsage,
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

    await ensureVehicleUsageSetting(vehicle.id);
    const vehicleWithUsage = (await attachVehicleProfile([vehicle]))[0];

    res.json({ data: vehicleWithUsage });
  } catch (error) {
    next(error);
  }
}

async function createVehicle(req, res, next) {
  try {
    const {
      vin,
      plateNumber,
      make,
      model,
      year,
      color,
      mileage,
      status,
      category,
      usageType,
      description,
      fuelType,
      transmission,
      passengers,
      dailyMileage,
    } = req.body;

    if (!vin || !plateNumber || !make || !model || !year) {
      const error = new Error("vin, plateNumber, make, model, and year are required");
      error.statusCode = 400;
      throw error;
    }

    const categoryPricing = await getVehicleCategoryPricing();
    const normalizedCategory = sanitizeVehicleCategory(category, "compact");
    const effectiveDailyRate =
      normalizedCategory === "unassigned"
        ? getRateForCategory(categoryPricing.rates, "compact")
        : getRateForCategory(categoryPricing.rates, normalizedCategory);

    const vehicle = await prisma.vehicle.create({
      data: {
        vin,
        plateNumber,
        make,
        model,
        year: Number(year),
        color: color || null,
        mileage: mileage !== undefined ? Number(mileage) : 0,
        dailyRate: effectiveDailyRate,
        status: status || "available",
      },
    });

    await updateVehicleProfile(vehicle.id, {
      category: normalizedCategory,
      usageType: sanitizeUsageType(usageType, "both"),
      description: sanitizeVehicleDescription(description, ""),
      fuelType: sanitizeVehicleText(fuelType, ""),
      transmission: sanitizeVehicleText(transmission, ""),
      passengers: sanitizePassengers(passengers, 0),
      dailyMileage: sanitizeDailyMileage(dailyMileage, 0),
    });
    const vehicleWithUsage = (await attachVehicleProfile([vehicle]))[0];

    res.status(201).json({ data: vehicleWithUsage });
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
    const {
      vin,
      plateNumber,
      make,
      model,
      year,
      color,
      mileage,
      status,
      category,
      usageType,
      description,
      fuelType,
      transmission,
      passengers,
      dailyMileage,
    } = req.body;

    const currentVehicle = await prisma.vehicle.findUnique({
      where: { id: Number(req.params.id) },
      select: { dailyRate: true },
    });

    if (!currentVehicle) {
      const error = new Error("Vehicle not found");
      error.statusCode = 404;
      throw error;
    }

    const currentProfile = await getVehicleProfileById(Number(req.params.id));
    const nextCategory =
      category !== undefined
        ? sanitizeVehicleCategory(category, currentProfile.category)
        : currentProfile.category;
    const categoryPricing = await getVehicleCategoryPricing();
    const effectiveDailyRate =
      nextCategory === "unassigned"
        ? Number(currentVehicle.dailyRate || 0)
        : getRateForCategory(categoryPricing.rates, nextCategory);

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
        dailyRate: effectiveDailyRate,
        status: status !== undefined ? status : undefined,
      },
    });

    if (
      category !== undefined ||
      usageType !== undefined ||
      description !== undefined ||
      fuelType !== undefined ||
      transmission !== undefined ||
      passengers !== undefined ||
      dailyMileage !== undefined
    ) {
      await updateVehicleProfile(vehicle.id, {
        category:
          category !== undefined
            ? sanitizeVehicleCategory(category, "compact")
            : undefined,
        usageType:
          usageType !== undefined
            ? sanitizeUsageType(usageType, "both")
            : undefined,
        description:
          description !== undefined
            ? sanitizeVehicleDescription(description, "")
            : undefined,
        fuelType:
          fuelType !== undefined
            ? sanitizeVehicleText(fuelType, "")
            : undefined,
        transmission:
          transmission !== undefined
            ? sanitizeVehicleText(transmission, "")
            : undefined,
        passengers:
          passengers !== undefined
            ? sanitizePassengers(passengers, 0)
            : undefined,
        dailyMileage:
          dailyMileage !== undefined
            ? sanitizeDailyMileage(dailyMileage, 0)
            : undefined,
      });
    } else {
      await ensureVehicleUsageSetting(vehicle.id);
    }

    const vehicleWithUsage = (await attachVehicleProfile([vehicle]))[0];

    res.json({ data: vehicleWithUsage });
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
      const excludeBookingId =
        req.query.excludeBookingId !== undefined && req.query.excludeBookingId !== null
          ? Number(req.query.excludeBookingId)
          : null;

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
        const overlapFilter = {
          status: { in: ["reserved", "active"] },
          pickupDatetime: { lt: returnDatetime },
          returnDatetime: { gt: pickupDatetime },
        };

        if (Number.isFinite(excludeBookingId) && excludeBookingId > 0) {
          overlapFilter.id = { not: excludeBookingId };
        }

        where.bookings = {
          none: {
            ...overlapFilter,
          },
        };
      }

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const vehiclesWithUsage = await attachVehicleProfile(vehicles);

    const availableVehicles = vehiclesWithUsage.map((vehicle) => ({
      ...vehicle,
      currentStatus: vehicle.status,
      status: "available",
    }));

    res.json({ data: availableVehicles });
  } catch (error) {
    next(error);
  }
}

async function getVehicleCategoryPricingOptions(req, res, next) {
  try {
    const settings = await getVehicleCategoryPricing();
    res.json({ data: settings });
  } catch (error) {
    next(error);
  }
}

async function updateVehicleCategoryPricingOptions(req, res, next) {
  try {
    const settings = await updateVehicleCategoryPricing(req.body || {});
    res.json({ data: settings, message: "Vehicle category pricing updated" });
  } catch (error) {
    next(error);
  }
}

async function uploadVehicleImage(req, res, next) {
  try {
    const vehicleId = Number(req.params.id);

    if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
      const error = new Error("Invalid vehicle ID");
      error.statusCode = 400;
      throw error;
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      const error = new Error("Vehicle not found");
      error.statusCode = 404;
      throw error;
    }

    if (!req.file) {
      const error = new Error("No image file provided");
      error.statusCode = 400;
      throw error;
    }

    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
      const error = new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      error.statusCode = 400;
      throw error;
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    await updateVehicleProfile(vehicleId, { imageUrl });

    res.json({ data: { imageUrl } });
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
  getVehicleCategoryPricingOptions,
  updateVehicleCategoryPricingOptions,
  uploadVehicleImage,
};
