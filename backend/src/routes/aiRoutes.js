const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");

// POST /api/ai/chat - Chat with the AI assistant
router.post("/chat", aiController.handleChat);

module.exports = router;
