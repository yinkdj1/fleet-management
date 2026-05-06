const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const prisma = require("../config/db");

/**
 * Generate a new TOTP secret for a user and return the QR code data URL.
 * The secret is NOT saved yet — the user must verify a code first.
 */
async function generateSetup(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });

  const secret = speakeasy.generateSecret({
    name: `Carsgidi:${user.email}`,
    issuer: "Carsgidi",
  });

  const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);

  // Store the temp secret on the user so we can verify it next
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret.base32 },
  });

  return { qrCode: qrDataUrl, secret: secret.base32 };
}

/**
 * Verify a TOTP code against the stored secret and enable 2FA.
 */
async function enableTwoFactor(userId, token) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorSecret) {
    throw Object.assign(new Error("No 2FA setup in progress"), { statusCode: 400 });
  }

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!valid) throw Object.assign(new Error("Invalid code"), { statusCode: 400 });

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  return { enabled: true };
}

/**
 * Disable 2FA for a user (requires a valid code as confirmation).
 */
async function disableTwoFactor(userId, token) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorEnabled) {
    throw Object.assign(new Error("2FA is not enabled"), { statusCode: 400 });
  }

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!valid) throw Object.assign(new Error("Invalid code"), { statusCode: 400 });

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });

  return { disabled: true };
}

/**
 * Verify a TOTP code for login (does not change DB state).
 */
function verifyToken(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });
}

module.exports = { generateSetup, enableTwoFactor, disableTwoFactor, verifyToken };
