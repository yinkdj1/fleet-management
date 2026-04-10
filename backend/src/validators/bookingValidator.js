// src/validators/bookingValidator.js

const ALLOWED_CREATE_STATUSES = ["draft", "reserved"];
const ALLOWED_BOOKING_STATUSES = [
  "draft",
  "reserved",
  "active",
  "completed",
  "cancelled",
  "no_show",
];

function buildValidationError(errors) {
  const error = new Error("Validation failed");
  error.statusCode = 400;
  error.errors = errors;
  return error;
}

function isInvalidDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime());
}

function validateCreateBooking(data) {
  const errors = {};

  if (!data.customerId) {
    errors.customerId = "Customer is required";
  }

  if (!data.vehicleId) {
    errors.vehicleId = "Vehicle is required";
  }

  if (!data.pickupDatetime) {
    errors.pickupDatetime = "Pickup datetime is required";
  }

  if (!data.returnDatetime) {
    errors.returnDatetime = "Return datetime is required";
  }

  if (data.pickupDatetime && isInvalidDate(data.pickupDatetime)) {
    errors.pickupDatetime = "Pickup datetime is invalid";
  }

  if (data.returnDatetime && isInvalidDate(data.returnDatetime)) {
    errors.returnDatetime = "Return datetime is invalid";
  }

  if (
    data.pickupDatetime &&
    data.returnDatetime &&
    !errors.pickupDatetime &&
    !errors.returnDatetime
  ) {
    const pickup = new Date(data.pickupDatetime);
    const dropoff = new Date(data.returnDatetime);

    if (pickup >= dropoff) {
      errors.returnDatetime = "Return datetime must be after pickup datetime";
    }
  }

  if (data.status && !ALLOWED_CREATE_STATUSES.includes(data.status)) {
    errors.status = `Booking can only be created with status: ${ALLOWED_CREATE_STATUSES.join(", ")}`;
  }

  if (Object.keys(errors).length > 0) {
    throw buildValidationError(errors);
  }
}

function validateRescheduleBooking(data) {
  const errors = {};

  if (!data.pickupDatetime) {
    errors.pickupDatetime = "Pickup datetime is required";
  }

  if (!data.returnDatetime) {
    errors.returnDatetime = "Return datetime is required";
  }

  if (data.pickupDatetime && isInvalidDate(data.pickupDatetime)) {
    errors.pickupDatetime = "Pickup datetime is invalid";
  }

  if (data.returnDatetime && isInvalidDate(data.returnDatetime)) {
    errors.returnDatetime = "Return datetime is invalid";
  }

  if (
    data.pickupDatetime &&
    data.returnDatetime &&
    !errors.pickupDatetime &&
    !errors.returnDatetime
  ) {
    const pickup = new Date(data.pickupDatetime);
    const dropoff = new Date(data.returnDatetime);

    if (pickup >= dropoff) {
      errors.returnDatetime = "Return datetime must be after pickup datetime";
    }
  }

  if (Object.keys(errors).length > 0) {
    throw buildValidationError(errors);
  }
}

function validateBookingStatusTransition(currentStatus, nextStatus) {
  const errors = {};

  if (!nextStatus) {
    errors.status = "New booking status is required";
  } else if (!ALLOWED_BOOKING_STATUSES.includes(nextStatus)) {
    errors.status = `Invalid booking status. Allowed: ${ALLOWED_BOOKING_STATUSES.join(", ")}`;
  }

  const allowedTransitions = {
    draft: ["reserved", "cancelled"],
    reserved: ["active", "cancelled", "no_show"],
    active: ["completed"],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  if (
    currentStatus &&
    nextStatus &&
    allowedTransitions[currentStatus] &&
    !allowedTransitions[currentStatus].includes(nextStatus)
  ) {
    errors.status = `Cannot change booking status from ${currentStatus} to ${nextStatus}`;
  }

  if (Object.keys(errors).length > 0) {
    throw buildValidationError(errors);
  }
}

module.exports = {
  validateCreateBooking,
  validateRescheduleBooking,
  validateBookingStatusTransition,
};