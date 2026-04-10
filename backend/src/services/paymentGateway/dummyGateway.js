function buildAppError(message, statusCode = 400, errors = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errors) error.errors = errors;
  return error;
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidLuhn(number) {
  let sum = 0;
  let shouldDouble = false;

  for (let i = number.length - 1; i >= 0; i -= 1) {
    let digit = Number(number[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function detectCardBrand(cardNumber) {
  if (/^4/.test(cardNumber)) return "visa";
  if (/^5[1-5]/.test(cardNumber)) return "mastercard";
  if (/^3[47]/.test(cardNumber)) return "amex";
  return "card";
}

function validateChargePayload(data = {}) {
  const errors = {};

  const cardNumber = digitsOnly(data.cardNumber);
  const cvv = String(data.cvv || "").trim();
  const cardholderName = String(data.cardholderName || "").trim();
  const expiry = String(data.expiry || "").trim();
  const amount = Number(data.amount);

  if (!cardholderName) {
    errors.cardholderName = "Cardholder name is required";
  }

  if (!cardNumber) {
    errors.cardNumber = "Card number is required";
  } else if (cardNumber.length < 12 || cardNumber.length > 19 || !isValidLuhn(cardNumber)) {
    errors.cardNumber = "Card number is invalid";
  }

  if (!expiry) {
    errors.expiry = "Expiry is required";
  } else {
    const match = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) {
      errors.expiry = "Expiry must be in MM/YY format";
    } else {
      const month = Number(match[1]);
      const year = Number(`20${match[2]}`);

      if (month < 1 || month > 12) {
        errors.expiry = "Expiry month is invalid";
      } else {
        const now = new Date();
        const expiryDate = new Date(year, month, 0, 23, 59, 59, 999);
        if (expiryDate < now) {
          errors.expiry = "Card has expired";
        }
      }
    }
  }

  if (!/^\d{3,4}$/.test(cvv)) {
    errors.cvv = "CVV is invalid";
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Payment amount must be greater than zero";
  }

  if (Object.keys(errors).length > 0) {
    throw buildAppError("Payment validation failed", 400, errors);
  }

  return {
    cardNumber,
    amount,
    currency: String(data.currency || "USD").toUpperCase(),
  };
}

function charge(data = {}) {
  if (process.env.NODE_ENV === "production") {
    throw buildAppError("Dummy payment gateway is disabled in production", 403);
  }

  const payload = validateChargePayload(data);

  if (payload.cardNumber.endsWith("0002")) {
    throw buildAppError("Test card declined", 402, {
      cardNumber: "Card was declined by the test gateway",
    });
  }

  const reference = `TESTPAY-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  return {
    status: "paid",
    paymentReference: reference,
    amount: Number(payload.amount.toFixed(2)),
    currency: payload.currency,
    cardBrand: detectCardBrand(payload.cardNumber),
    last4: payload.cardNumber.slice(-4),
    gateway: "dummy-credit-card",
    message: "Test payment approved",
  };
}

module.exports = {
  charge,
};
