const express = require("express");
const router = express.Router();
const {
  listNotificationTemplates,
  getNotificationTemplate,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
} = require("../services/notificationTemplateService");

// GET /api/notifications
router.get("/", async (req, res, next) => {
  try {
    const templates = await listNotificationTemplates();
    res.json({ data: templates });
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/:id
router.get("/:id", async (req, res, next) => {
  try {
    const template = await getNotificationTemplate(req.params.id);
    if (!template) return res.status(404).json({ error: "Not found" });
    res.json({ data: template });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications
router.post("/", async (req, res, next) => {
  try {
    const template = await createNotificationTemplate(req.body);
    res.status(201).json({ data: template });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id
router.put("/:id", async (req, res, next) => {
  try {
    const template = await updateNotificationTemplate(req.params.id, req.body);
    res.json({ data: template });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await deleteNotificationTemplate(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
