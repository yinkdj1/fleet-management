// src/services/bookingService.js

const prisma = require("../config/db");

const {
  validateCreateBooking,
  validateRescheduleBooking,
  validateBookingStatusTransition,
} = require("../validators/bookingValidator");

const {
  syncVehicleStatusOnBookingCreate,
  syncVehicleStatusOnBookingStatusChange,
  reevaluateVehicleStatus,
} = require("./vehicleStatusService");

function buildAppError(message, statusCode = 400, errors = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errors) error.errors = errors;
  return error;
}

function roundToTwo(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function getVehicleDailyRate(vehicle) {
  const parsedRate = Number(vehicle?.dailyRate);

  if (!Number.isFinite(parsedRate) || parsedRate < 0) {
    throw buildAppError("Vehicle rate is invalid", 400, {
      vehicleRate: "Vehicle must have a valid dailyRate",
    });
  }

  return parsedRate;
}

function calculateRentalDays(pickupDatetime, returnDatetime) {
  const pickup = new Date(pickupDatetime);
  const returnDate = new Date(returnDatetime);

  if (Number.isNaN(pickup.getTime()) || Number.isNaN(returnDate.getTime())) {
    throw buildAppError("Invalid pickup or return date", 400, {
      pickupDatetime: "Pickup and return dates must be valid",
    });
  }

  const diffMs = returnDate.getTime() - pickup.getTime();

  if (diffMs <= 0) {
    throw buildAppError("Return date must be after pickup date", 400, {
      returnDatetime: "Return date must be later than pickup date",
    });
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(days, 1);
}

function calculateBookingAmounts({ pickupDatetime, returnDatetime, vehicle }) {
  const days = calculateRentalDays(pickupDatetime, returnDatetime);
  const dailyRate = getVehicleDailyRate(vehicle);

  const subtotal = roundToTwo(dailyRate * days);
  const tax = roundToTwo(subtotal * 0.07);
  const deposit = 100;
  const totalAmount = roundToTwo(subtotal + tax + deposit);

  return {
    days,
    dailyRate,
    subtotal,
    tax,
    deposit,
    totalAmount,
  };
}

async function ensureCustomerExists(customerId) {
  const customer = await prisma.customer.findUnique({
    where: { id: Number(customerId) },
  });

  if (!customer) {
    throw buildAppError("Customer not found", 404, {
      customerId: "Selected customer does not exist",
    });
  }

  return customer;
}

async function ensureVehicleExists(vehicleId) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: Number(vehicleId) },
  });

  if (!vehicle) {
    throw buildAppError("Vehicle not found", 404, {
      vehicleId: "Selected vehicle does not exist",
    });
  }

  return vehicle;
}

function validateVehicleBookable(vehicle) {
  if (["maintenance", "out_of_service"].includes(vehicle.status)) {
    throw buildAppError("Vehicle is not bookable", 400, {
      vehicleId: `Vehicle is currently ${vehicle.status}`,
    });
  }
}

async function checkVehicleAvailability(
  vehicleId,
  pickupDatetime,
  returnDatetime,
  excludeBookingId = null
) {
  const overlappingBooking = await prisma.booking.findFirst({
    where: {
      vehicleId: Number(vehicleId),
      status: {
        in: ["reserved", "active"],
      },
      id: excludeBookingId ? { not: Number(excludeBookingId) } : undefined,
      pickupDatetime: {
        lt: new Date(returnDatetime),
      },
      returnDatetime: {
        gt: new Date(pickupDatetime),
      },
    },
  });

  if (overlappingBooking) {
    throw buildAppError("Vehicle is unavailable for selected dates", 400, {
      vehicleId: "Vehicle already has an overlapping booking",
    });
  }
}

async function getBookings(filters = {}) {
  const {
    status,
    customerId,
    vehicleId,
    from,
    to,
    search,
    page = 1,
    limit = 10,
  } = filters;

  const where = {};

  if (status) where.status = status;
  if (customerId) where.customerId = Number(customerId);
  if (vehicleId) where.vehicleId = Number(vehicleId);

  if (from || to) {
    where.pickupDatetime = {};
    if (from) where.pickupDatetime.gte = new Date(from);
    if (to) where.pickupDatetime.lte = new Date(to);
  }

  if (search) {
    const searchTerm = String(search);
    where.OR = [
      {
        customer: {
          firstName: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      },
      {
        customer: {
          lastName: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      },
      {
        vehicle: {
          plateNumber: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        customer: true,
        vehicle: true,
      },
      orderBy: {
        pickupDatetime: "desc",
      },
      skip,
      take: Number(limit),
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
}

async function getBookingById(id) {
  const booking = await prisma.booking.findUnique({
    where: { id: Number(id) },
    include: {
      customer: true,
      vehicle: true,
      checkout: true,
      checkin: true,
      documents: true,
    },
  });

  if (!booking) {
    throw buildAppError("Booking not found", 404);
  }

  return booking;
}

async function createBooking(data) {
  validateCreateBooking(data);

  await ensureCustomerExists(data.customerId);
  const vehicle = await ensureVehicleExists(data.vehicleId);

  validateVehicleBookable(vehicle);

  await checkVehicleAvailability(
    data.vehicleId,
    data.pickupDatetime,
    data.returnDatetime
  );

  const pricing = calculateBookingAmounts({
    pickupDatetime: data.pickupDatetime,
    returnDatetime: data.returnDatetime,
    vehicle,
  });

  const booking = await prisma.booking.create({
    data: {
      customerId: Number(data.customerId),
      vehicleId: Number(data.vehicleId),
      pickupDatetime: new Date(data.pickupDatetime),
      returnDatetime: new Date(data.returnDatetime),
      status: data.status || "reserved",
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      deposit: pricing.deposit,
      totalAmount: pricing.totalAmount,
      paymentStatus: data.paymentStatus || "unpaid",
    },
    include: {
      customer: true,
      vehicle: true,
    },
  });

  await syncVehicleStatusOnBookingCreate(booking.vehicleId, booking.status);

  return {
    ...booking,
    pricing: {
      days: pricing.days,
      dailyRate: pricing.dailyRate,
    },
  };
}

async function updateBooking(id, data) {
  const existingBooking = await getBookingById(id);

  if (
    ["active", "completed", "cancelled", "no_show"].includes(
      existingBooking.status
    )
  ) {
    throw buildAppError("This booking can no longer be edited", 400);
  }

  const nextPickup = data.pickupDatetime || existingBooking.pickupDatetime;
  const nextReturn = data.returnDatetime || existingBooking.returnDatetime;
  const nextVehicleId = data.vehicleId || existingBooking.vehicleId;
  const nextCustomerId = data.customerId || existingBooking.customerId;

  await ensureCustomerExists(nextCustomerId);
  const vehicle = await ensureVehicleExists(nextVehicleId);

  validateVehicleBookable(vehicle);

  validateCreateBooking({
    customerId: nextCustomerId,
    vehicleId: nextVehicleId,
    pickupDatetime: nextPickup,
    returnDatetime: nextReturn,
    status: existingBooking.status,
  });

  await checkVehicleAvailability(
    nextVehicleId,
    nextPickup,
    nextReturn,
    existingBooking.id
  );

  const pricing = calculateBookingAmounts({
    pickupDatetime: nextPickup,
    returnDatetime: nextReturn,
    vehicle,
  });

  const updatedBooking = await prisma.booking.update({
    where: { id: Number(id) },
    data: {
      customerId: Number(nextCustomerId),
      vehicleId: Number(nextVehicleId),
      pickupDatetime: new Date(nextPickup),
      returnDatetime: new Date(nextReturn),
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      deposit: pricing.deposit,
      totalAmount: pricing.totalAmount,
      paymentStatus: data.paymentStatus || existingBooking.paymentStatus,
    },
    include: {
      customer: true,
      vehicle: true,
    },
  });

  if (Number(existingBooking.vehicleId) !== Number(updatedBooking.vehicleId)) {
    await reevaluateVehicleStatus(existingBooking.vehicleId);
    await syncVehicleStatusOnBookingCreate(
      updatedBooking.vehicleId,
      updatedBooking.status
    );
  }

  return {
    ...updatedBooking,
    pricing: {
      days: pricing.days,
      dailyRate: pricing.dailyRate,
    },
  };
}

async function rescheduleBooking(id, data) {
  const booking = await getBookingById(id);

  if (!["draft", "reserved"].includes(booking.status)) {
    throw buildAppError(
      "Only draft or reserved bookings can be rescheduled",
      400
    );
  }

  validateRescheduleBooking(data);

  await checkVehicleAvailability(
    booking.vehicleId,
    data.pickupDatetime,
    data.returnDatetime,
    booking.id
  );

  const vehicle = await ensureVehicleExists(booking.vehicleId);

  const pricing = calculateBookingAmounts({
    pickupDatetime: data.pickupDatetime,
    returnDatetime: data.returnDatetime,
    vehicle,
  });

  return prisma.booking.update({
    where: { id: Number(id) },
    data: {
      pickupDatetime: new Date(data.pickupDatetime),
      returnDatetime: new Date(data.returnDatetime),
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      deposit: pricing.deposit,
      totalAmount: pricing.totalAmount,
    },
    include: {
      customer: true,
      vehicle: true,
    },
  });
}

async function changeBookingStatus(id, nextStatus) {
  const booking = await getBookingById(id);

  validateBookingStatusTransition(booking.status, nextStatus);

  const updatedBooking = await prisma.booking.update({
    where: { id: Number(id) },
    data: {
      status: nextStatus,
    },
    include: {
      customer: true,
      vehicle: true,
    },
  });

  await syncVehicleStatusOnBookingStatusChange(
    updatedBooking.vehicleId,
    nextStatus
  );

  return updatedBooking;
}

async function checkoutBooking(id, data, photos = []) {
  const booking = await getBookingById(id);

  if (booking.status !== "reserved") {
    throw buildAppError("Only reserved bookings can be checked out", 400);
  }

  if (!data.mileageOut || !data.fuelLevelOut) {
    throw buildAppError("Mileage out and fuel level out are required", 400, {
      mileageOut: !data.mileageOut ? "Mileage out is required" : undefined,
      fuelLevelOut: !data.fuelLevelOut
        ? "Fuel level out is required"
        : undefined,
    });
  }

  const checkout = await prisma.checkout.create({
    data: {
      bookingId: Number(id),
      mileageOut: Number(data.mileageOut),
      fuelLevelOut: data.fuelLevelOut,
      notesOut: data.notesOut || null,
    },
  });

  const photoDocuments = [];
  if (photos && photos.length > 0) {
    for (const photo of photos) {
      const document = await prisma.document.create({
        data: {
          bookingId: Number(id),
          documentType: "checkout_photo",
          fileUrl: photo.path,
        },
      });
      photoDocuments.push(document);
    }
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: Number(id) },
    data: {
      status: "active",
    },
    include: {
      customer: true,
      vehicle: true,
      checkout: true,
    },
  });

  await syncVehicleStatusOnBookingStatusChange(
    updatedBooking.vehicleId,
    "active"
  );

  return {
    ...updatedBooking,
    checkout,
    checkoutPhotos: photoDocuments,
  };
}

async function checkinBooking(id, data, photos = []) {
  const booking = await getBookingById(id);

  if (booking.status !== "active") {
    throw buildAppError("Only active bookings can be checked in", 400);
  }

  if (!data.mileageIn || !data.fuelLevelIn) {
    throw buildAppError("Mileage in and fuel level in are required", 400, {
      mileageIn: !data.mileageIn ? "Mileage in is required" : undefined,
      fuelLevelIn: !data.fuelLevelIn ? "Fuel level in is required" : undefined,
    });
  }

  const checkin = await prisma.checkin.create({
    data: {
      bookingId: Number(id),
      mileageIn: Number(data.mileageIn),
      fuelLevelIn: data.fuelLevelIn,
      notesIn: data.notesIn || null,
      damageFee: data.damageFee ? Number(data.damageFee) : 0,
      lateFee: data.lateFee ? Number(data.lateFee) : 0,
      cleaningFee: data.cleaningFee ? Number(data.cleaningFee) : 0,
    },
  });

  const photoDocuments = [];
  if (photos && photos.length > 0) {
    for (const photo of photos) {
      const document = await prisma.document.create({
        data: {
          bookingId: Number(id),
          documentType: "checkin_photo",
          fileUrl: photo.path,
        },
      });
      photoDocuments.push(document);
    }
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: Number(id) },
    data: {
      status: "completed",
    },
    include: {
      customer: true,
      vehicle: true,
      checkout: true,
      checkin: true,
    },
  });

  await syncVehicleStatusOnBookingStatusChange(
    updatedBooking.vehicleId,
    "completed"
  );

  return {
    ...updatedBooking,
    checkin,
    checkinPhotos: photoDocuments,
  };
}

module.exports = {
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  rescheduleBooking,
  changeBookingStatus,
  checkoutBooking,
  checkinBooking,
  checkVehicleAvailability,
  calculateBookingAmounts,
  calculateRentalDays,
};