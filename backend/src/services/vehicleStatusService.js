// src/services/vehicleStatusService.js

const prisma = require("../config/db");

async function setVehicleStatus(vehicleId, status) {
  return prisma.vehicle.update({
    where: { id: Number(vehicleId) },
    data: { status: status.toLowerCase() },
  });
}

async function syncVehicleStatusOnBookingCreate(vehicleId, bookingStatus) {
  if (bookingStatus === "reserved") {
    return setVehicleStatus(vehicleId, "reserved");
  }

  if (bookingStatus === "active") {
    return setVehicleStatus(vehicleId, "rented");
  }

  return null;
}

async function syncVehicleStatusOnBookingStatusChange(vehicleId, nextStatus) {
  if (nextStatus === "reserved") {
    return setVehicleStatus(vehicleId, "reserved");
  }

  if (nextStatus === "active") {
    return setVehicleStatus(vehicleId, "rented");
  }

  if (["completed", "cancelled", "no_show"].includes(nextStatus)) {
    return reevaluateVehicleStatus(vehicleId);
  }

  return null;
}

async function reevaluateVehicleStatus(vehicleId) {
  const activeBooking = await prisma.booking.findFirst({
    where: {
      vehicleId: Number(vehicleId),
      status: "active",
    },
    orderBy: { id: "desc" },
  });

  if (activeBooking) {
    return setVehicleStatus(vehicleId, "rented");
  }

  const reservedBooking = await prisma.booking.findFirst({
    where: {
      vehicleId: Number(vehicleId),
      status: "reserved",
    },
    orderBy: { pickupDatetime: "asc" },
  });

  if (reservedBooking) {
    return setVehicleStatus(vehicleId, "reserved");
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: Number(vehicleId) },
    select: { status: true },
  });

  if (!vehicle) return null;

  if (["maintenance", "out_of_service"].includes(vehicle.status)) {
    return null;
  }

  return setVehicleStatus(vehicleId, "available");
}

module.exports = {
  setVehicleStatus,
  syncVehicleStatusOnBookingCreate,
  syncVehicleStatusOnBookingStatusChange,
  reevaluateVehicleStatus,
};