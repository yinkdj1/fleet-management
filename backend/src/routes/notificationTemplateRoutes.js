const express = require("express");

const {
  getNotificationTemplates,
  createNotificationTemplateHandler,
  updateNotificationTemplateHandler,
  deleteNotificationTemplateHandler,
} = require("../controllers/notificationTemplateController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/templates", protect, getNotificationTemplates);
router.post("/templates", protect, createNotificationTemplateHandler);
router.put("/templates/:id", protect, updateNotificationTemplateHandler);
router.delete("/templates/:id", protect, deleteNotificationTemplateHandler);

module.exports = router;