/**
 * Notification Template Service
 * Manages SMS/email templates stored in the database.
 * Falls back gracefully if the NotificationTemplate table doesn't exist yet.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * List all notification templates.
 * Returns empty array if table doesn't exist or on any error.
 */
async function listNotificationTemplates() {
  try {
    return await prisma.notificationTemplate.findMany();
  } catch {
    return [];
  }
}

/**
 * Get a single template by id.
 */
async function getNotificationTemplate(id) {
  try {
    return await prisma.notificationTemplate.findUnique({ where: { id: Number(id) } });
  } catch {
    return null;
  }
}

/**
 * Create a new notification template.
 */
async function createNotificationTemplate(data) {
  return prisma.notificationTemplate.create({ data });
}

/**
 * Update a notification template.
 */
async function updateNotificationTemplate(id, data) {
  return prisma.notificationTemplate.update({ where: { id: Number(id) }, data });
}

/**
 * Delete a notification template.
 */
async function deleteNotificationTemplate(id) {
  return prisma.notificationTemplate.delete({ where: { id: Number(id) } });
}

module.exports = {
  listNotificationTemplates,
  getNotificationTemplate,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
};
