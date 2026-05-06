const crypto = require("crypto");
const prisma = require("../config/db");
const generateToken = require("../utils/generateToken");
const twoFactorService = require("../services/twoFactorService");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = String(storedHash).split(":");
  if (!salt || !key) {
    return false;
  }
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(derivedKey, "hex"));
}

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    if (!email || !password) {
      const error = new Error("Email and password are required");
      error.statusCode = 400;
      throw error;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const error = new Error("A user with that email already exists");
      error.statusCode = 400;
      throw error;
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: name || email,
        email,
        passwordHash,
        role: role || "staff",
      },
    });

    const token = generateToken(user);
    res.status(201).json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error = new Error("Email and password are required");
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    // If 2FA is enabled, don't issue a token yet — require TOTP code
    if (user.twoFactorEnabled) {
      return res.json({ data: { requires2fa: true, userId: user.id } });
    }

    const token = generateToken(user);
    res.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
}

/** POST /auth/2fa/confirm — validate TOTP code after password step, issue JWT */
async function confirmLogin(req, res, next) {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) {
      return res.status(400).json({ message: "userId and token are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ message: "2FA not set up for this account" });
    }

    const valid = twoFactorService.verifyToken(user.twoFactorSecret, token);
    if (!valid) return res.status(401).json({ message: "Invalid authenticator code" });

    const jwt = generateToken(user);
    res.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: jwt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/** POST /auth/2fa/setup — generate secret + QR code (authenticated) */
async function setup2fa(req, res, next) {
  try {
    const result = await twoFactorService.generateSetup(req.user.id);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

/** POST /auth/2fa/enable — confirm code to activate 2FA (authenticated) */
async function enable2fa(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "token is required" });
    const result = await twoFactorService.enableTwoFactor(req.user.id, token);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

/** POST /auth/2fa/disable — confirm code to deactivate 2FA (authenticated) */
async function disable2fa(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "token is required" });
    const result = await twoFactorService.disableTwoFactor(req.user.id, token);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

function getMe(req, res) {
  const { twoFactorSecret: _omit, passwordHash: _omit2, ...safeUser } = req.user;
  res.json({ data: safeUser });
}

module.exports = {
  register,
  login,
  getMe,
  confirmLogin,
  setup2fa,
  enable2fa,
  disable2fa,
};
