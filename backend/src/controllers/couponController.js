const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const twilio = require("twilio");

// In-memory coupon store for demo (replace with DB in production)
let coupons = [];

// Create a coupon
exports.createCoupon = (req, res) => {
  const { code, type, value, expiry } = req.body;
  if (!code || !type || !value || !expiry) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const coupon = {
    id: uuidv4(),
    code,
    type, // "percent" or "amount"
    value: Number(value),
    expiry,
    createdAt: new Date().toISOString(),
  };
  coupons.push(coupon);
  res.json({ message: "Coupon created", coupon });
};

// Get all coupons
exports.getCoupons = (req, res) => {
  res.json({ coupons });
};

// Delete a coupon
exports.deleteCoupon = (req, res) => {
  const { id } = req.params;
  const before = coupons.length;
  coupons = coupons.filter(c => c.id !== id);
  if (coupons.length === before) {
    return res.status(404).json({ message: "Coupon not found" });
  }
  res.json({ message: "Coupon deleted" });
};

// Send a coupon via Email or SMS
exports.sendCoupon = async (req, res) => {
  const { couponId, method, recipient } = req.body;

  if (!couponId || !method || !recipient) {
    return res.status(400).json({ message: "couponId, method, and recipient are required" });
  }

  const coupon = coupons.find(c => c.id === couponId);
  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  const discount =
    coupon.type === "percent"
      ? `${coupon.value}% off`
      : `$${coupon.value} off`;

  const messageText = `Your exclusive coupon code is: ${coupon.code} — ${discount}. Expires: ${coupon.expiry}. Use it on your next booking!`;

  try {
    if (method === "email") {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: recipient,
        subject: "Your Exclusive Coupon Code",
        text: messageText,
        html: `<p>${messageText}</p>`,
      });

      return res.json({ message: `Coupon sent via email to ${recipient}` });
    } else if (method === "sms") {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      await client.messages.create({
        body: messageText,
        from: process.env.TWILIO_FROM,
        to: recipient,
      });

      return res.json({ message: `Coupon sent via SMS to ${recipient}` });
    } else {
      return res.status(400).json({ message: "method must be 'email' or 'sms'" });
    }
  } catch (err) {
    console.error("Send coupon error:", err);
    return res.status(500).json({ message: "Failed to send coupon: " + (err.message || "Unknown error") });
  }
};
