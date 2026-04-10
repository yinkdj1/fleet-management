const bookingService = require("../services/bookingService");
const { getAvailableVehicles } = require("./vehicleController");
const paymentGateway = require("../services/paymentGateway");

async function createPublicReservation(req, res, next) {
  try {
    const reservation = await bookingService.createPublicReservation(req.body);
    res.status(201).json({ data: reservation });
  } catch (error) {
    next(error);
  }
}

async function createTestPayment(req, res, next) {
  try {
    const payment = paymentGateway.charge(req.body);
    res.status(201).json({ data: payment });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPublicAvailableVehicles: getAvailableVehicles,
  createTestPayment,
  createPublicReservation,
};
