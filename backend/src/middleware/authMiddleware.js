const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const error = new Error("Authorization token missing or malformed");
      error.statusCode = 401;
      throw error;
    }

    if (!process.env.JWT_SECRET) {
      const error = new Error("JWT_SECRET is not defined");
      error.statusCode = 500;
      throw error;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
    });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401;
    }
    next(error);
  }
}

module.exports = {
  protect,
};
