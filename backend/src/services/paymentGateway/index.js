const dummyGateway = require("./dummyGateway");
const stripeGateway = require("./stripeGateway");

function buildAppError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getProviderName() {
  return String(process.env.PAYMENT_PROVIDER || "dummy").trim().toLowerCase();
}

function getGateway() {
  const provider = getProviderName();

  if (provider === "dummy") {
    return dummyGateway;
  }

  if (provider === "stripe") {
    return stripeGateway;
  }

  throw buildAppError(`Unsupported payment provider: ${provider}`, 500);
}

function charge(data) {
  return getGateway().charge(data);
}

module.exports = {
  charge,
};
