const bookingService = require("../services/bookingService");

async function getBookings(req, res, next) {
  try {
    const bookings = await bookingService.getBookings(req.query);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
}

async function getBookingById(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function createBooking(req, res, next) {
  try {
    const booking = await bookingService.createBooking(req.body);
    res.status(201).json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function updateBooking(req, res, next) {
  try {
    const booking = await bookingService.updateBooking(req.params.id, req.body);
    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function rescheduleBooking(req, res, next) {
  try {
    const booking = await bookingService.rescheduleBooking(req.params.id, req.body);
    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function changeBookingStatus(req, res, next) {
  try {
    const booking = await bookingService.changeBookingStatus(req.params.id, req.body.status);
    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function checkoutBooking(req, res, next) {
  try {
    const booking = await bookingService.checkoutBooking(req.params.id, req.body, req.files || []);
    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function checkinBooking(req, res, next) {
  try {
    const booking = await bookingService.checkinBooking(req.params.id, req.body, req.files || []);
    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function createGuestPrecheckoutLink(req, res, next) {
  try {
    const payload = await bookingService.createGuestPrecheckoutLink(req.params.id);
    res.json({ data: payload });
  } catch (error) {
    next(error);
  }
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
  createGuestPrecheckoutLink,
};
