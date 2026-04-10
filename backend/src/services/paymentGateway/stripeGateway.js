function buildAppError(message, statusCode = 500, errors = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errors) error.errors = errors;
  return error;
}

function charge() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw buildAppError("Stripe is not configured. Set STRIPE_SECRET_KEY.", 500);
  }

  // Placeholder adapter: implement actual Stripe PaymentIntent flow here.
  throw buildAppError("Stripe gateway adapter not yet implemented", 501);
}

module.exports = {
  charge,
};
