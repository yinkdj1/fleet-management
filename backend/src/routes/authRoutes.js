const express = require("express");
const router = express.Router();

const { register, login, getMe, confirmLogin, setup2fa, enable2fa, disable2fa } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", protect, register);
router.post("/login", login);
router.get("/me", protect, getMe);

// 2FA routes
router.post("/2fa/confirm", confirmLogin);          // public — second step of login
router.post("/2fa/setup", protect, setup2fa);       // authenticated — get QR code
router.post("/2fa/enable", protect, enable2fa);     // authenticated — activate 2FA
router.post("/2fa/disable", protect, disable2fa);   // authenticated — deactivate 2FA

module.exports = router;