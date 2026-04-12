const {
  listNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
} = require("../services/notificationTemplateService");

async function getNotificationTemplates(req, res, next) {
  try {
    const templates = await listNotificationTemplates();
    res.json({ data: templates });
  } catch (error) {
    next(error);
  }
}

async function createNotificationTemplateHandler(req, res, next) {
  try {
    const template = await createNotificationTemplate(req.body || {});
    res.status(201).json({ data: template, message: "Notification template created" });
  } catch (error) {
    next(error);
  }
}

async function updateNotificationTemplateHandler(req, res, next) {
  try {
    const template = await updateNotificationTemplate(req.params.id, req.body || {});
    res.json({ data: template, message: "Notification template updated" });
  } catch (error) {
    next(error);
  }
}

async function deleteNotificationTemplateHandler(req, res, next) {
  try {
    await deleteNotificationTemplate(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotificationTemplates,
  createNotificationTemplateHandler,
  updateNotificationTemplateHandler,
  deleteNotificationTemplateHandler,
};