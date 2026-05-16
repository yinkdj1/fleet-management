// Late Fee Controller
// Handles charging and skipping late fees for overdue bookings

const prisma = require("../config/db");

const LATE_FEE_AMOUNT = 20; // $20 late fee

/**
 * Charge a $20 late fee to a booking
 * POST /api/bookings/:id/charge-late-fee
 */
async function chargeLateFee(req, res, next) {
  try {
    const bookingId = Number(req.params.id);
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if already charged or skipped
    if (booking.lateFeeCharged) {
      return res.status(400).json({ error: "Late fee already charged" });
    }

    if (booking.lateFeeSkipped) {
      return res.status(400).json({ error: "Late fee was skipped" });
    }

    // Check if booking is overdue by at least 2 hours
    const now = new Date();
    const returnDate = new Date(booking.returnDatetime);
    const hoursOverdue = (now - returnDate) / (1000 * 60 * 60);

    if (hoursOverdue < 2) {
      return res.status(400).json({ 
        error: "Booking must be overdue by at least 2 hours to charge late fee" 
      });
    }

    // Update booking with late fee
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        lateFeeCharged: true,
        lateFeeAmount: LATE_FEE_AMOUNT,
        totalAmount: booking.totalAmount + LATE_FEE_AMOUNT,
      },
      include: {
        customer: true,
        vehicle: true,
        checkout: true,
        checkin: true,
      },
    });

    res.json({
      success: true,
      message: `Late fee of $${LATE_FEE_AMOUNT} charged successfully`,
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Skip charging the late fee for a booking
 * POST /api/bookings/:id/skip-late-fee
 */
async function skipLateFee(req, res, next) {
  try {
    const bookingId = Number(req.params.id);
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if already charged
    if (booking.lateFeeCharged) {
      return res.status(400).json({ error: "Late fee already charged, cannot skip" });
    }

    if (booking.lateFeeSkipped) {
      return res.status(400).json({ error: "Late fee already skipped" });
    }

    // Mark as skipped
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        lateFeeSkipped: true,
      },
      include: {
        customer: true,
        vehicle: true,
        checkout: true,
        checkin: true,
      },
    });

    res.json({
      success: true,
      message: "Late fee skipped successfully",
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Charge an extra day fee to a booking (after 6 hours overdue)
 * POST /api/bookings/:id/charge-extra-day-fee
 */
async function chargeExtraDayFee(req, res, next) {
  try {
    const bookingId = Number(req.params.id);
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if already charged
    if (booking.extraDayFeeCharged) {
      return res.status(400).json({ error: "Extra day fee already charged" });
    }

    // Check if booking is overdue by at least 6 hours
    const now = new Date();
    const returnDate = new Date(booking.returnDatetime);
    const hoursOverdue = (now - returnDate) / (1000 * 60 * 60);

    if (hoursOverdue < 6) {
      return res.status(400).json({ 
        error: "Booking must be overdue by at least 6 hours to charge extra day fee" 
      });
    }

    // Calculate extra day fee (vehicle's daily rate)
    const extraDayFee = booking.vehicle.dailyRate;

    // Update booking with extra day fee
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        extraDayFeeCharged: true,
        extraDayFeeAmount: extraDayFee,
        totalAmount: booking.totalAmount + extraDayFee,
      },
      include: {
        customer: true,
        vehicle: true,
        checkout: true,
        checkin: true,
      },
    });

    res.json({
      success: true,
      message: `Extra day fee of $${extraDayFee.toFixed(2)} charged successfully`,
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  chargeLateFee,
  skipLateFee,
  chargeExtraDayFee,
};
