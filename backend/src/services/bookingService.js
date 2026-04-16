// src/services/bookingService.js

const prisma = require("../config/db");
const jwt = require("jsonwebtoken");

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
const { hasSmtpConfig, sendEmail } = require("./emailService");
const { getDiscountSettings } = require("./discountSettingsService");
const twilio = require("twilio");

const SERVICE_CHARGE_DAILY = 15;
const PRECHECKOUT_AUTO_MARKER_TYPE = "precheckout_prompt_auto_sent";
let twilioClient;

const CHECKOUT_SAFE_INCLUDE = {
  select: {
    id: true,
    bookingId: true,
    mileageOut: true,
    fuelLevelOut: true,
    notesOut: true,
    checkoutTime: true,
  },
};

const CHECKIN_SAFE_INCLUDE = {
  select: {
    id: true,
    bookingId: true,
    mileageIn: true,
    fuelLevelIn: true,
    notesIn: true,
    damageFee: true,
    lateFee: true,
    cleaningFee: true,
    checkinTime: true,
  },
};

function buildAppError(message, statusCode = 400, errors = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errors) error.errors = errors;
  return error;
}

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw buildAppError("JWT secret is not configured", 500);
  }
  return process.env.JWT_SECRET;
}

function getFrontendBaseUrl() {
  return (process.env.FRONTEND_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function formatDateTimeForEmail(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value || "");
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isWithinGuestManageCutoff(pickupDatetime, now = new Date()) {
  const pickup = new Date(pickupDatetime);
  if (Number.isNaN(pickup.getTime())) {
    return true;
  }

  const cutoffMs = 24 * 60 * 60 * 1000;
  return pickup.getTime() - now.getTime() <= cutoffMs;
}

function roundToTwo(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizeEmail(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized || null;
}

function normalizePhone(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeName(value) {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}

function hasTwilioSmsConfig() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

function getTwilioClient() {
  if (!twilioClient) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  return twilioClient;
}

function getMinimumAllowedDateOfBirth(today = new Date()) {
  const date = new Date(today);
  date.setFullYear(date.getFullYear() - 18);
  date.setHours(0, 0, 0, 0);
  return date;
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

async function getBookingDiscountForDays(days) {
  const settings = await getDiscountSettings();
  const matchingTier = settings.tiers.find(
    (tier) => days >= tier.minDays && Number(tier.percentage) > 0
  );

  if (!matchingTier) {
    return {
      percentage: 0,
      decimalRate: 0,
    };
  }

  return {
    percentage: matchingTier.percentage,
    decimalRate: matchingTier.percentage / 100,
  };
}

async function calculateBookingAmounts({ pickupDatetime, returnDatetime, vehicle }) {
  const days = calculateRentalDays(pickupDatetime, returnDatetime);
  const dailyRate = getVehicleDailyRate(vehicle);
  const discount = await getBookingDiscountForDays(days);

  const rentalSubtotal = roundToTwo(dailyRate * days);
  const rentalDiscount = roundToTwo(rentalSubtotal * discount.decimalRate);
  const discountedRentalSubtotal = roundToTwo(rentalSubtotal - rentalDiscount);
  const serviceCharge = roundToTwo(SERVICE_CHARGE_DAILY * days);
  const subtotal = roundToTwo(discountedRentalSubtotal + serviceCharge);
  const tax = roundToTwo(subtotal * 0.07);
  const deposit = 100;
  const totalAmount = roundToTwo(subtotal + tax + deposit);

  return {
    days,
    dailyRate,
    rentalSubtotal,
    rentalDiscount,
    discountedRentalSubtotal,
    discountPercentage: discount.percentage,
    serviceCharge,
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

  if (status) {
    const normalizedStatus = String(status).trim().toLowerCase();
    if (normalizedStatus === "other") {
      where.status = {
        in: ["reserved", "cancelled", "no_show"],
      };
    } else {
      where.status = normalizedStatus;
    }
  }
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
        checkout: CHECKOUT_SAFE_INCLUDE,
        checkin: CHECKIN_SAFE_INCLUDE,
      },
      orderBy: {
        id: "desc",
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
      checkout: CHECKOUT_SAFE_INCLUDE,
      checkin: CHECKIN_SAFE_INCLUDE,
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

  const pricing = await calculateBookingAmounts({
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
      rentalSubtotal: pricing.rentalSubtotal,
      rentalDiscount: pricing.rentalDiscount,
      discountedRentalSubtotal: pricing.discountedRentalSubtotal,
      discountPercentage: pricing.discountPercentage,
      serviceCharge: pricing.serviceCharge,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      deposit: pricing.deposit,
      totalAmount: pricing.totalAmount,
    },
  };
}

function validatePublicReservationPayload(data = {}) {
  const errors = {};
  const customer = data.customer || {};

  if (!customer.firstName || !String(customer.firstName).trim()) {
    errors.firstName = "First name is required";
  }

  if (!customer.lastName || !String(customer.lastName).trim()) {
    errors.lastName = "Last name is required";
  }

  if (!customer.email && !customer.phone) {
    errors.contact = "Either email or phone is required";
  }

  if (!customer.addressLine || !String(customer.addressLine).trim()) {
    errors.addressLine = "Address is required";
  }

  if (!customer.city || !String(customer.city).trim()) {
    errors.city = "City is required";
  }

  if (!customer.state || !String(customer.state).trim()) {
    errors.state = "State is required";
  }

  if (!customer.zip || !String(customer.zip).trim()) {
    errors.zip = "Zip is required";
  }

  if (!customer.driversLicenseNo || !String(customer.driversLicenseNo).trim()) {
    errors.driversLicenseNo = "Driver's license number is required";
  }

  if (!customer.dateOfBirth) {
    errors.dateOfBirth = "Date of birth is required";
  } else {
    const dob = new Date(customer.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      errors.dateOfBirth = "Date of birth is invalid";
    } else if (dob > getMinimumAllowedDateOfBirth()) {
      errors.dateOfBirth = "Customer must be at least 18 years old";
    }
  }

  if (customer.email) {
    const email = String(customer.email).trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      errors.email = "Email format is invalid";
    }
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

  if (data.paymentStatus !== "paid") {
    errors.paymentStatus = "Payment must be completed before confirming reservation";
  }

  if (!data.paymentReference || !String(data.paymentReference).trim()) {
    errors.paymentReference = "Payment reference is required";
  }

  if (!data.paymentConfirmed) {
    errors.paymentConfirmed = "Please confirm payment before submitting";
  }

  if (Object.keys(errors).length > 0) {
    throw buildAppError("Validation failed", 400, errors);
  }
}

async function findOrCreatePublicCustomer(customerData) {
  const firstName = String(customerData.firstName || "").trim();
  const lastName = String(customerData.lastName || "").trim();
  const email = normalizeEmail(customerData.email);
  const phone = normalizePhone(customerData.phone);
  const addressLine = customerData.addressLine
    ? String(customerData.addressLine).trim()
    : null;
  const city = customerData.city ? String(customerData.city).trim() : null;
  const state = customerData.state ? String(customerData.state).trim() : null;
  const zip = customerData.zip ? String(customerData.zip).trim() : null;
  const address = [addressLine, city, state, zip].filter(Boolean).join(", ") || null;
  const driversLicenseNo = customerData.driversLicenseNo
    ? String(customerData.driversLicenseNo).trim()
    : null;
  const dateOfBirth = customerData.dateOfBirth
    ? new Date(customerData.dateOfBirth)
    : null;

  if (email) {
    const existingByEmail = await prisma.customer.findUnique({
      where: { email },
    });

    if (existingByEmail) {
      return prisma.customer.update({
        where: { id: existingByEmail.id },
        data: {
          firstName: firstName || existingByEmail.firstName,
          lastName: lastName || existingByEmail.lastName,
          phone: phone || existingByEmail.phone,
          address: address || existingByEmail.address,
          addressLine: addressLine || existingByEmail.addressLine,
          city: city || existingByEmail.city,
          state: state || existingByEmail.state,
          zip: zip || existingByEmail.zip,
          driversLicenseNo: driversLicenseNo || existingByEmail.driversLicenseNo,
          dateOfBirth: dateOfBirth || existingByEmail.dateOfBirth,
        },
      });
    }
  }

  if (phone) {
    const existingByPhone = await prisma.customer.findFirst({
      where: { phone },
    });

    if (existingByPhone) {
      return prisma.customer.update({
        where: { id: existingByPhone.id },
        data: {
          firstName: firstName || existingByPhone.firstName,
          lastName: lastName || existingByPhone.lastName,
          email: email || existingByPhone.email,
          address: address || existingByPhone.address,
          addressLine: addressLine || existingByPhone.addressLine,
          city: city || existingByPhone.city,
          state: state || existingByPhone.state,
          zip: zip || existingByPhone.zip,
          driversLicenseNo: driversLicenseNo || existingByPhone.driversLicenseNo,
          dateOfBirth: dateOfBirth || existingByPhone.dateOfBirth,
        },
      });
    }
  }

  try {
    return await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        address,
        addressLine,
        city,
        state,
        zip,
        driversLicenseNo,
        dateOfBirth,
      },
    });
  } catch (error) {
    if (error.code === "P2002" && email) {
      const fallbackCustomer = await prisma.customer.findUnique({
        where: { email },
      });
      if (fallbackCustomer) {
        return fallbackCustomer;
      }
    }

    throw error;
  }
}

function createGuestManageTokenFromBooking(booking, expiresIn = "7d") {
  const email = normalizeEmail(booking?.customer?.email);
  const lastName = normalizeName(booking?.customer?.lastName);

  if (!email || !lastName) {
    throw buildAppError("Guest must have email and last name to receive booking management links", 400, {
      contact: "Customer email and last name are required",
    });
  }

  return jwt.sign(
    {
      type: "booking_manage",
      bookingId: booking.id,
      email,
      lastName,
    },
    getJwtSecret(),
    { expiresIn }
  );
}

function buildGuestManageLinks(booking) {
  const token = createGuestManageTokenFromBooking(booking);
  const baseUrl = getFrontendBaseUrl();
  const manageBase = `${baseUrl}/guest-manage/${token}`;

  return {
    token,
    manageUrl: manageBase,
    modifyUrl: `${manageBase}?action=modify`,
    cancelUrl: `${manageBase}?action=cancel`,
  };
}

async function sendReservationConfirmationEmail(booking) {
  const email = normalizeEmail(booking?.customer?.email);
  if (!email) {
    return {
      sent: false,
      reason: "guest_email_missing",
      message: "Reservation created, but guest email is missing.",
      links: null,
    };
  }

  const links = buildGuestManageLinks(booking);

  const guestFirstName = escapeHtml(booking.customer?.firstName || "Guest");
  const vehicleLabel = escapeHtml(
    `${booking.vehicle?.make || ""} ${booking.vehicle?.model || ""}`.trim()
  );
  const plateNumber = escapeHtml(booking.vehicle?.plateNumber || "N/A");
  const pickupDisplay = escapeHtml(formatDateTimeForEmail(booking.pickupDatetime));
  const returnDisplay = escapeHtml(formatDateTimeForEmail(booking.returnDatetime));
  const totalDisplay = Number(booking.totalAmount || 0).toFixed(2);

  const subject = `Booking confirmation #${booking.id}`;
  const html = `
    <div style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:20px 24px;background:linear-gradient(120deg,#0f172a,#1e293b);color:#ffffff;">
            <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">Carsgidi</p>
            <h1 style="margin:6px 0 0;font-size:24px;line-height:1.2;">Booking Confirmed</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 12px;font-size:15px;">Hello ${guestFirstName},</p>
            <p style="margin:0 0 20px;font-size:15px;">Your reservation is confirmed. Here are your booking details:</p>

            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;width:38%;">Booking ID</td><td style="padding:10px 12px;">#${booking.id}</td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;">Vehicle</td><td style="padding:10px 12px;">${vehicleLabel} (${plateNumber})</td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;">Pickup</td><td style="padding:10px 12px;">${pickupDisplay}</td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;">Return</td><td style="padding:10px 12px;">${returnDisplay}</td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;">Total</td><td style="padding:10px 12px;">$${totalDisplay}</td></tr>
            </table>

            <p style="margin:20px 0 12px;font-size:15px;">Need to make changes?</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 10px;">
              <tr>
                <td style="padding-right:6px;">
                  <a href="${links.modifyUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:8px;font-weight:600;font-size:14px;">Modify Reservation</a>
                </td>
                <td style="padding-left:6px;">
                  <a href="${links.cancelUrl}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:8px;font-weight:600;font-size:14px;">Cancel Reservation</a>
                </td>
              </tr>
            </table>

            <p style="margin:14px 0 0;font-size:12px;color:#6b7280;">If the buttons above do not work, copy and paste these links into your browser:</p>
            <p style="margin:6px 0 0;font-size:12px;word-break:break-all;">Modify: ${escapeHtml(links.modifyUrl)}</p>
            <p style="margin:4px 0 0;font-size:12px;word-break:break-all;">Cancel: ${escapeHtml(links.cancelUrl)}</p>
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = [
    `Hello ${booking.customer?.firstName || "Guest"},`,
    "",
    "Your reservation is confirmed.",
    `Booking ID: #${booking.id}`,
    `Vehicle: ${booking.vehicle?.make || ""} ${booking.vehicle?.model || ""} (${booking.vehicle?.plateNumber || "N/A"})`,
    `Pickup: ${formatDateTimeForEmail(booking.pickupDatetime)}`,
    `Return: ${formatDateTimeForEmail(booking.returnDatetime)}`,
    `Total: $${totalDisplay}`,
    "",
    `Modify Reservation: ${links.modifyUrl}`,
    `Cancel Reservation: ${links.cancelUrl}`,
  ].join("\n");

  if (!hasSmtpConfig()) {
    return {
      sent: false,
      reason: "smtp_not_configured",
      message: "Reservation created and confirmation links generated, but SMTP is not configured.",
      links,
    };
  }

  try {
    const result = await sendEmail({
      to: email,
      subject,
      html,
      text,
    });

    return {
      sent: result.sent,
      reason: result.reason,
      message: result.sent
        ? "Booking confirmation email sent."
        : "Reservation created, but confirmation email failed.",
      links,
    };
  } catch {
    return {
      sent: false,
      reason: "smtp_error",
      message: "Reservation created, but confirmation email failed.",
      links,
    };
  }
}

async function sendReservationConfirmationSms(booking) {
  const normalizedPhone = normalizePhone(booking?.customer?.phone);

  if (!normalizedPhone) {
    return {
      sent: false,
      reason: "guest_phone_missing",
      message: "Reservation created, but guest phone is missing.",
      links: null,
    };
  }

  const links = buildGuestManageLinks(booking);
  const vehicleLabel = `${booking.vehicle?.make || ""} ${booking.vehicle?.model || ""}`.trim();
  const plateNumber = booking.vehicle?.plateNumber || "N/A";
  const pickupDisplay = formatDateTimeForEmail(booking.pickupDatetime);
  const returnDisplay = formatDateTimeForEmail(booking.returnDatetime);

  const smsBody = [
    `Carsgidi booking #${booking.id} is confirmed.`,
    `${vehicleLabel} (${plateNumber})`,
    `Pickup: ${pickupDisplay}`,
    `Return: ${returnDisplay}`,
    `Manage: ${links.manageUrl}`,
  ].join(" ");

  let twilioAttempted = false;
  let twilioFailed = false;

  if (hasTwilioSmsConfig()) {
    twilioAttempted = true;
    try {
      const client = getTwilioClient();
      const response = await client.messages.create({
        to: normalizedPhone,
        from: process.env.TWILIO_FROM_NUMBER,
        body: smsBody,
      });

      if (response?.sid) {
        return {
          sent: true,
          reason: "sent_twilio",
          message: "Booking confirmation SMS sent.",
          links,
        };
      }
    } catch {
      twilioFailed = true;
    }
  }

  const smsWebhookUrl =
    process.env.RESERVATION_SMS_WEBHOOK_URL ||
    process.env.PRECHECKOUT_SMS_WEBHOOK_URL;

  if (!smsWebhookUrl) {
    if (twilioAttempted && twilioFailed) {
      return {
        sent: false,
        reason: "twilio_failed_no_webhook",
        message: "Reservation created, but confirmation SMS failed.",
        links,
      };
    }

    return {
      sent: false,
      reason: "sms_not_configured",
      message: "Reservation created, but SMS provider is not configured.",
      links,
    };
  }

  try {
    const response = await fetch(smsWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: normalizedPhone,
        message: smsBody,
        bookingId: booking.id,
      }),
    });

    return {
      sent: response.ok,
      reason: response.ok ? "sent_webhook" : "webhook_failed",
      message: response.ok
        ? twilioFailed
          ? "Twilio failed; booking confirmation SMS sent via webhook."
          : "Booking confirmation SMS sent."
        : "Reservation created, but confirmation SMS failed.",
      links,
    };
  } catch {
    return {
      sent: false,
      reason: twilioFailed ? "twilio_and_webhook_failed" : "webhook_error",
      message: "Reservation created, but confirmation SMS failed.",
      links,
    };
  }
}

async function sendReservationCancellationEmail(booking) {
  const email = normalizeEmail(booking?.customer?.email);

  if (!email) {
    return {
      sent: false,
      reason: "guest_email_missing",
      message: "Booking cancelled, but guest email is missing.",
    };
  }

  const guestFirstName = escapeHtml(booking.customer?.firstName || "Guest");
  const vehicleLabel = escapeHtml(
    `${booking.vehicle?.make || ""} ${booking.vehicle?.model || ""}`.trim()
  );
  const plateNumber = escapeHtml(booking.vehicle?.plateNumber || "N/A");
  const pickupDisplay = escapeHtml(formatDateTimeForEmail(booking.pickupDatetime));
  const returnDisplay = escapeHtml(formatDateTimeForEmail(booking.returnDatetime));

  const subject = `Booking cancelled #${booking.id}`;
  const html = `
    <div style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:20px 24px;background:linear-gradient(120deg,#7f1d1d,#991b1b);color:#ffffff;">
            <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">Carsgidi</p>
            <h1 style="margin:6px 0 0;font-size:24px;line-height:1.2;">Booking Cancelled</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 12px;font-size:15px;">Hello ${guestFirstName},</p>
            <p style="margin:0 0 20px;font-size:15px;">Your reservation has been cancelled successfully.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;width:38%;">Booking ID</td><td style="padding:10px 12px;">#${booking.id}</td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;">Vehicle</td><td style="padding:10px 12px;">${vehicleLabel} (${plateNumber})</td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;">Pickup</td><td style="padding:10px 12px;">${pickupDisplay}</td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;">Return</td><td style="padding:10px 12px;">${returnDisplay}</td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;">Status</td><td style="padding:10px 12px;">Cancelled</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = [
    `Hello ${booking.customer?.firstName || "Guest"},`,
    "",
    "Your reservation has been cancelled successfully.",
    `Booking ID: #${booking.id}`,
    `Vehicle: ${booking.vehicle?.make || ""} ${booking.vehicle?.model || ""} (${booking.vehicle?.plateNumber || "N/A"})`,
    `Pickup: ${formatDateTimeForEmail(booking.pickupDatetime)}`,
    `Return: ${formatDateTimeForEmail(booking.returnDatetime)}`,
    "Status: Cancelled",
  ].join("\n");

  if (!hasSmtpConfig()) {
    return {
      sent: false,
      reason: "smtp_not_configured",
      message: "Booking cancelled, but SMTP is not configured for confirmation email.",
    };
  }

  try {
    const result = await sendEmail({
      to: email,
      subject,
      html,
      text,
    });

    return {
      sent: result.sent,
      reason: result.reason,
      message: result.sent
        ? "Cancellation confirmation email sent."
        : "Booking cancelled, but cancellation email failed.",
    };
  } catch {
    return {
      sent: false,
      reason: "smtp_error",
      message: "Booking cancelled, but cancellation email failed.",
    };
  }
}

async function createPublicReservation(data) {
  validatePublicReservationPayload(data);

  const customer = await findOrCreatePublicCustomer(data.customer || {});

  const booking = await createBooking({
    customerId: customer.id,
    vehicleId: data.vehicleId,
    pickupDatetime: data.pickupDatetime,
    returnDatetime: data.returnDatetime,
    status: "reserved",
    paymentStatus: "paid",
  });

  const confirmation = await sendReservationConfirmationEmail(booking);
  const confirmationSms = await sendReservationConfirmationSms(booking);

  return {
    ...booking,
    confirmationEmail: {
      sent: confirmation.sent,
      message: confirmation.message,
      links: confirmation.links,
    },
    confirmationSms: {
      sent: confirmationSms.sent,
      message: confirmationSms.message,
      links: confirmationSms.links,
    },
  };
}

function verifyGuestManageToken(token) {
  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.type !== "booking_manage") {
      throw buildAppError("Invalid booking management token", 401);
    }
    return payload;
  } catch {
    throw buildAppError("Invalid or expired booking management token", 401);
  }
}

async function getBookingByManageToken(token) {
  const payload = verifyGuestManageToken(token);

  const booking = await prisma.booking.findUnique({
    where: { id: Number(payload.bookingId) },
    include: {
      customer: true,
      vehicle: true,
      checkout: CHECKOUT_SAFE_INCLUDE,
      checkin: CHECKIN_SAFE_INCLUDE,
      documents: true,
    },
  });

  if (!booking) {
    throw buildAppError("Booking not found", 404);
  }

  if (
    normalizeEmail(booking.customer?.email) !== normalizeEmail(payload.email) ||
    normalizeName(booking.customer?.lastName) !== normalizeName(payload.lastName)
  ) {
    throw buildAppError("Booking management token no longer matches booking guest", 403);
  }

  if (isWithinGuestManageCutoff(booking.pickupDatetime)) {
    throw buildAppError(
      "Modify and cancel links are no longer available within 24 hours of pickup",
      403
    );
  }

  return booking;
}

async function rescheduleBookingByManageToken(token, data = {}) {
  const booking = await getBookingByManageToken(token);

  if (booking.status !== "reserved") {
    throw buildAppError("Only reserved bookings can be modified", 400);
  }

  const updatedBooking = await updateBooking(booking.id, {
    pickupDatetime: data.pickupDatetime,
    returnDatetime: data.returnDatetime,
    vehicleId:
      data.vehicleId !== undefined && data.vehicleId !== null && String(data.vehicleId).trim() !== ""
        ? Number(data.vehicleId)
        : booking.vehicleId,
  });

  return {
    ...updatedBooking,
    status: "reserved",
  };
}

async function cancelBookingByManageToken(token) {
  const booking = await getBookingByManageToken(token);

  if (booking.status !== "reserved") {
    throw buildAppError("Only reserved bookings can be cancelled", 400);
  }

  const cancelledBooking = await changeBookingStatus(booking.id, "cancelled");
  const cancellationEmail = await sendReservationCancellationEmail(cancelledBooking);

  return {
    ...cancelledBooking,
    cancelledAt: new Date().toISOString(),
    cancellationEmail,
  };
}

async function findPublicCustomerByContact(contact = {}) {
  const email = normalizeEmail(contact.email);
  const phone = normalizePhone(contact.phone);

  if (!email && !phone) {
    throw buildAppError("Email or phone is required", 400, {
      contact: "Provide an email or phone",
    });
  }

  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        email ? { email } : null,
        phone ? { phone } : null,
      ].filter(Boolean),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      addressLine: true,
      city: true,
      state: true,
      zip: true,
      driversLicenseNo: true,
      dateOfBirth: true,
    },
  });

  return customer;
}

function createPrecheckoutTokenFromBooking(booking) {
  const email = normalizeEmail(booking.customer?.email);
  const lastName = normalizeName(booking.customer?.lastName);

  if (!email || !lastName) {
    throw buildAppError("Guest must have email and last name to receive pre-checkout link", 400, {
      contact: "Customer email and last name are required",
    });
  }

  const token = jwt.sign(
    {
      type: "precheckout",
      bookingId: booking.id,
      email,
      lastName,
    },
    getJwtSecret(),
    { expiresIn: "48h" }
  );

  const frontendBase = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
  const link = `${frontendBase.replace(/\/$/, "")}/guest-precheckout/${token}`;

  return {
    token,
    link,
    email,
    lastName,
  };
}

async function sendPrecheckoutEmail({ booking, to, link }) {
  const subject = `Complete pre-checkout for booking #${booking.id}`;
  const html = `<p>Hello ${booking.customer.firstName || "Guest"},</p><p>Please complete your pre-checkout identity step using this secure link:</p><p><a href="${link}">${link}</a></p>`;
  const text = `Complete pre-checkout for booking #${booking.id}: ${link}`;

  if (hasSmtpConfig()) {
    try {
      const result = await sendEmail({ to, subject, html, text });
      return {
        sent: result.sent,
        message: result.sent
          ? "Pre-checkout link sent to guest email."
          : "Email dispatch failed.",
      };
    } catch {
      return {
        sent: false,
        message: "Email dispatch failed.",
      };
    }
  }

  if (process.env.PRECHECKOUT_EMAIL_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.PRECHECKOUT_EMAIL_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          text,
          bookingId: booking.id,
        }),
      });

      return {
        sent: response.ok,
        message: response.ok
          ? "Pre-checkout link sent to guest email."
          : "Email dispatch failed.",
      };
    } catch {
      return {
        sent: false,
        message: "Email dispatch failed.",
      };
    }
  }

  return {
    sent: false,
    message: "SMTP/webhook email provider not configured.",
  };
}

async function sendPrecheckoutSms({ booking, phone, link }) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return {
      sent: false,
      message: "Guest phone not available.",
    };
  }

  const smsBody = `Carsgidi booking #${booking.id}: complete pre-checkout here ${link}`;
  let twilioAttempted = false;
  let twilioFailed = false;

  if (hasTwilioSmsConfig()) {
    twilioAttempted = true;
    try {
      const client = getTwilioClient();
      const response = await client.messages.create({
        to: normalizedPhone,
        from: process.env.TWILIO_FROM_NUMBER,
        body: smsBody,
      });

      if (response?.sid) {
        return {
          sent: true,
          message: "Pre-checkout link sent by SMS via Twilio.",
        };
      }
    } catch {
      twilioFailed = true;
    }
  }

  if (!process.env.PRECHECKOUT_SMS_WEBHOOK_URL) {
    if (twilioAttempted && twilioFailed) {
      return {
        sent: false,
        message: "Twilio dispatch failed and SMS webhook is not configured.",
      };
    }

    return {
      sent: false,
      message: "SMS provider not configured.",
    };
  }

  try {
    const response = await fetch(process.env.PRECHECKOUT_SMS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: normalizedPhone,
        message: smsBody,
        bookingId: booking.id,
      }),
    });

    return {
      sent: response.ok,
      message: response.ok
        ? twilioFailed
          ? "Twilio dispatch failed; pre-checkout link sent by SMS via webhook."
          : "Pre-checkout link sent by SMS via webhook."
        : twilioFailed
          ? "Twilio dispatch failed and webhook dispatch failed."
          : "SMS webhook dispatch failed.",
    };
  } catch {
    return {
      sent: false,
      message: twilioFailed
        ? "Twilio dispatch failed and webhook dispatch failed."
        : "SMS webhook dispatch failed.",
    };
  }
}

async function markAutoPrecheckoutPromptSent(bookingId) {
  await prisma.document.create({
    data: {
      bookingId: Number(bookingId),
      documentType: PRECHECKOUT_AUTO_MARKER_TYPE,
      fileUrl: `sent:${new Date().toISOString()}`,
    },
  });
}

async function hasAutoPrecheckoutPromptMarker(bookingId) {
  const marker = await prisma.document.findFirst({
    where: {
      bookingId: Number(bookingId),
      documentType: PRECHECKOUT_AUTO_MARKER_TYPE,
    },
    select: {
      id: true,
    },
  });

  return Boolean(marker);
}

async function sendPrecheckoutPromptForBooking(bookingId, options = {}) {
  const {
    automatic = false,
  } = options;

  const booking = await prisma.booking.findUnique({
    where: { id: Number(bookingId) },
    include: {
      customer: true,
      vehicle: true,
    },
  });

  if (!booking) {
    throw buildAppError("Booking not found", 404);
  }

  if (booking.status !== "reserved") {
    return {
      bookingId: booking.id,
      skipped: true,
      message: "Booking is not in reserved state.",
    };
  }

  const pickupTime = new Date(booking.pickupDatetime).getTime();
  const nowTime = Date.now();
  const msToPickup = pickupTime - nowTime;

  if (automatic) {
    const within24Hours = msToPickup > 0 && msToPickup <= 24 * 60 * 60 * 1000;
    if (!within24Hours) {
      return {
        bookingId: booking.id,
        skipped: true,
        message: "Booking is outside automatic pre-checkout window.",
      };
    }

    const alreadySent = await hasAutoPrecheckoutPromptMarker(booking.id);
    if (alreadySent) {
      return {
        bookingId: booking.id,
        skipped: true,
        message: "Automatic pre-checkout prompt already sent.",
      };
    }
  }

  const { token, link, email } = createPrecheckoutTokenFromBooking(booking);

  const emailResult = await sendPrecheckoutEmail({
    booking,
    to: email,
    link,
  });

  const smsResult = await sendPrecheckoutSms({
    booking,
    phone: booking.customer?.phone,
    link,
  });

  const anySent = emailResult.sent || smsResult.sent;

  if (automatic && anySent) {
    await markAutoPrecheckoutPromptSent(booking.id);
  }

  const deliveryMessage = anySent
    ? "Pre-checkout prompt sent to guest."
    : "Pre-checkout link generated, but delivery failed.";

  return {
    bookingId: booking.id,
    guestEmail: email,
    guestPhone: normalizePhone(booking.customer?.phone),
    link,
    token,
    emailSent: emailResult.sent,
    smsSent: smsResult.sent,
    emailMessage: emailResult.message,
    smsMessage: smsResult.message,
    message: deliveryMessage,
  };
}

async function createGuestPrecheckoutLink(bookingId) {
  return sendPrecheckoutPromptForBooking(bookingId, { automatic: false });
}

async function processAutomaticPrecheckoutPrompts() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingBookings = await prisma.booking.findMany({
    where: {
      status: "reserved",
      pickupDatetime: {
        gt: now,
        lte: windowEnd,
      },
    },
    select: {
      id: true,
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const booking of upcomingBookings) {
    const result = await sendPrecheckoutPromptForBooking(booking.id, {
      automatic: true,
    });

    if (result.skipped) {
      skipped += 1;
    } else if (result.emailSent || result.smsSent) {
      sent += 1;
    }
  }

  return {
    scanned: upcomingBookings.length,
    sent,
    skipped,
  };
}

function verifyPrecheckoutToken(token) {
  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.type !== "precheckout") {
      throw buildAppError("Invalid pre-checkout token", 401);
    }
    return payload;
  } catch {
    throw buildAppError("Invalid or expired pre-checkout token", 401);
  }
}

async function getPrecheckoutBookingByToken(token) {
  const payload = verifyPrecheckoutToken(token);

  const booking = await prisma.booking.findUnique({
    where: { id: Number(payload.bookingId) },
    include: {
      customer: true,
      vehicle: true,
      documents: true,
    },
  });

  if (!booking) {
    throw buildAppError("Booking not found", 404);
  }

  if (
    normalizeEmail(booking.customer?.email) !== normalizeEmail(payload.email) ||
    normalizeName(booking.customer?.lastName) !== normalizeName(payload.lastName)
  ) {
    throw buildAppError("Pre-checkout token no longer matches booking guest", 403);
  }

  return booking;
}

async function uploadPrecheckoutGuestDocument(token, documentKind, file) {
  if (!file) {
    throw buildAppError("Photo upload is required", 400, {
      photo: "Photo is required",
    });
  }

  const booking = await getPrecheckoutBookingByToken(token);

  const normalizedKind = String(documentKind || "").trim().toLowerCase();
  const documentType =
    normalizedKind === "license"
      ? "precheckout_license"
      : normalizedKind === "selfie"
        ? "precheckout_selfie_with_license"
        : null;

  if (!documentType) {
    throw buildAppError("Invalid document type", 400, {
      documentType: "Use 'license' or 'selfie'",
    });
  }

  const document = await prisma.document.create({
    data: {
      bookingId: Number(booking.id),
      customerId: booking.customerId,
      documentType,
      fileUrl: file.path,
    },
  });

  return {
    bookingId: booking.id,
    document,
  };
}

async function getPublicBookingByIdForGuest(id, guest = {}) {
  const email = normalizeEmail(guest.email);
  const phone = normalizePhone(guest.phone);
  const lastName = normalizeName(guest.lastName);

  if ((!email && !phone) || !lastName) {
    throw buildAppError("Verification details are required", 400, {
      verification: "Provide last name and either email or phone",
    });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: Number(id) },
    include: {
      customer: true,
      vehicle: true,
      checkout: CHECKOUT_SAFE_INCLUDE,
      checkin: CHECKIN_SAFE_INCLUDE,
      documents: true,
    },
  });

  if (!booking) {
    throw buildAppError("Booking not found", 404);
  }

  const customerLastName = normalizeName(booking.customer?.lastName);
  const customerEmail = normalizeEmail(booking.customer?.email);
  const customerPhone = normalizePhone(booking.customer?.phone);

  const contactMatch =
    (email && customerEmail && email === customerEmail) ||
    (phone && customerPhone && phone === customerPhone);

  if (!contactMatch || customerLastName !== lastName) {
    throw buildAppError("Guest verification failed", 403, {
      verification: "Booking details do not match guest identity",
    });
  }

  return booking;
}

async function checkoutBookingPublic(id, data, photos = [], guest = {}) {
  await getPublicBookingByIdForGuest(id, guest);
  return checkoutBooking(id, data, photos);
}

async function checkinBookingPublic(id, data, photos = [], guest = {}) {
  await getPublicBookingByIdForGuest(id, guest);
  return checkinBooking(id, data, photos);
}

async function extendBookingPublic(id, data = {}, guest = {}) {
  const booking = await getPublicBookingByIdForGuest(id, guest);

  if (!["reserved", "active"].includes(booking.status)) {
    throw buildAppError("Only reserved or active bookings can be extended", 400);
  }

  const requestedReturn = data.returnDatetime || data.newReturnDatetime;
  if (!requestedReturn) {
    throw buildAppError("New return datetime is required", 400, {
      returnDatetime: "New return datetime is required",
    });
  }

  const nextReturn = new Date(requestedReturn);
  if (Number.isNaN(nextReturn.getTime())) {
    throw buildAppError("New return datetime is invalid", 400, {
      returnDatetime: "New return datetime is invalid",
    });
  }

  if (nextReturn <= new Date(booking.returnDatetime)) {
    throw buildAppError("New return datetime must be later than current return datetime", 400, {
      returnDatetime: "Choose a later return datetime to extend your trip",
    });
  }

  await checkVehicleAvailability(
    booking.vehicleId,
    booking.pickupDatetime,
    nextReturn,
    booking.id
  );

  const vehicle = await ensureVehicleExists(booking.vehicleId);
  const currentReturn = new Date(booking.returnDatetime);
  const extensionDays = calculateRentalDays(currentReturn, nextReturn);
  const dailyRate = getVehicleDailyRate(vehicle);
  const discount = await getBookingDiscountForDays(extensionDays);
  const extensionRentalSubtotal = roundToTwo(dailyRate * extensionDays);
  const extensionRentalDiscount = roundToTwo(
    extensionRentalSubtotal * discount.decimalRate
  );
  const extensionDiscountedRentalSubtotal = roundToTwo(
    extensionRentalSubtotal - extensionRentalDiscount
  );
  const extensionServiceCharge = roundToTwo(SERVICE_CHARGE_DAILY * extensionDays);
  const extensionSubtotal = roundToTwo(
    extensionDiscountedRentalSubtotal + extensionServiceCharge
  );
  const extensionTax = roundToTwo(extensionSubtotal * 0.07);
  const extensionTotal = roundToTwo(extensionSubtotal + extensionTax);

  const nextSubtotal = roundToTwo(Number(booking.subtotal || 0) + extensionSubtotal);
  const nextTax = roundToTwo(Number(booking.tax || 0) + extensionTax);
  const nextTotalAmount = roundToTwo(Number(booking.totalAmount || 0) + extensionTotal);

  const updatedBooking = await prisma.booking.update({
    where: { id: Number(booking.id) },
    data: {
      returnDatetime: nextReturn,
      subtotal: nextSubtotal,
      tax: nextTax,
      totalAmount: nextTotalAmount,
    },
    include: {
      customer: true,
      vehicle: true,
      checkout: CHECKOUT_SAFE_INCLUDE,
      checkin: CHECKIN_SAFE_INCLUDE,
      documents: true,
    },
  });

  return {
    ...updatedBooking,
    extensionCharge: {
      days: extensionDays,
      dailyRate,
      rentalSubtotal: extensionRentalSubtotal,
      rentalDiscount: extensionRentalDiscount,
      discountedRentalSubtotal: extensionDiscountedRentalSubtotal,
      discountPercentage: discount.percentage,
      serviceCharge: extensionServiceCharge,
      subtotal: extensionSubtotal,
      tax: extensionTax,
      total: extensionTotal,
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

  const pricing = await calculateBookingAmounts({
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
      rentalSubtotal: pricing.rentalSubtotal,
      rentalDiscount: pricing.rentalDiscount,
      discountedRentalSubtotal: pricing.discountedRentalSubtotal,
      discountPercentage: pricing.discountPercentage,
      serviceCharge: pricing.serviceCharge,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      deposit: pricing.deposit,
      totalAmount: pricing.totalAmount,
    },
  };
}

async function swapBookingVehicle(id, data = {}) {
  const booking = await getBookingById(id);

  if (!["reserved", "active"].includes(booking.status)) {
    throw buildAppError("Only reserved or active bookings can swap vehicles", 400);
  }

  const nextVehicleId = Number(data.vehicleId);
  if (!Number.isFinite(nextVehicleId) || nextVehicleId <= 0) {
    throw buildAppError("Vehicle is required", 400, {
      vehicleId: "Vehicle is required",
    });
  }

  if (Number(booking.vehicleId) === nextVehicleId) {
    throw buildAppError("Please select a different vehicle", 400, {
      vehicleId: "Selected vehicle is already assigned to this booking",
    });
  }

  const vehicle = await ensureVehicleExists(nextVehicleId);
  validateVehicleBookable(vehicle);

  await checkVehicleAvailability(
    nextVehicleId,
    booking.pickupDatetime,
    booking.returnDatetime,
    booking.id
  );

  const pricing = await calculateBookingAmounts({
    pickupDatetime: booking.pickupDatetime,
    returnDatetime: booking.returnDatetime,
    vehicle,
  });

  const updatedBooking = await prisma.booking.update({
    where: { id: Number(id) },
    data: {
      vehicleId: nextVehicleId,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      deposit: pricing.deposit,
      totalAmount: pricing.totalAmount,
    },
    include: {
      customer: true,
      vehicle: true,
      checkout: CHECKOUT_SAFE_INCLUDE,
      checkin: CHECKIN_SAFE_INCLUDE,
      documents: true,
    },
  });

  await reevaluateVehicleStatus(booking.vehicleId);
  await syncVehicleStatusOnBookingCreate(updatedBooking.vehicleId, updatedBooking.status);

  return {
    ...updatedBooking,
    swap: {
      fromVehicleId: Number(booking.vehicleId),
      toVehicleId: Number(updatedBooking.vehicleId),
    },
    pricing: {
      days: pricing.days,
      dailyRate: pricing.dailyRate,
      rentalSubtotal: pricing.rentalSubtotal,
      rentalDiscount: pricing.rentalDiscount,
      discountedRentalSubtotal: pricing.discountedRentalSubtotal,
      discountPercentage: pricing.discountPercentage,
      serviceCharge: pricing.serviceCharge,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      deposit: pricing.deposit,
      totalAmount: pricing.totalAmount,
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

  const pricing = await calculateBookingAmounts({
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
    select: CHECKOUT_SAFE_INCLUDE.select,
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
      checkout: CHECKOUT_SAFE_INCLUDE,
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
    select: CHECKIN_SAFE_INCLUDE.select,
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
      checkout: CHECKOUT_SAFE_INCLUDE,
      checkin: CHECKIN_SAFE_INCLUDE,
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
  createPublicReservation,
  createGuestPrecheckoutLink,
  processAutomaticPrecheckoutPrompts,
  getPrecheckoutBookingByToken,
  uploadPrecheckoutGuestDocument,
  getBookingByManageToken,
  rescheduleBookingByManageToken,
  cancelBookingByManageToken,
  findPublicCustomerByContact,
  getPublicBookingByIdForGuest,
  updateBooking,
  swapBookingVehicle,
  rescheduleBooking,
  changeBookingStatus,
  checkoutBooking,
  checkoutBookingPublic,
  checkinBooking,
  checkinBookingPublic,
  extendBookingPublic,
  checkVehicleAvailability,
  calculateBookingAmounts,
  calculateRentalDays,
};