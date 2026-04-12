const prisma = require("../config/db");

const NOTIFICATION_TEMPLATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "NotificationTemplates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "subject" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "anchor" TEXT NOT NULL DEFAULT 'pickup',
    "timing" TEXT NOT NULL DEFAULT 'before',
    "offsetMinutes" INTEGER NOT NULL DEFAULT 60,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const VALID_CHANNELS = ["email", "sms"];
const VALID_ANCHORS = ["booking_created", "pickup", "return", "midpoint"];
const VALID_TIMINGS = ["before", "after", "exact"];

function sanitizeTemplateText(value, fallback = "", maxLength = 5000) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().replace(/\r\n/g, "\n");
  return normalized.slice(0, maxLength);
}

function sanitizeChannel(value, fallback = "email") {
  const normalized = String(value || "").trim().toLowerCase();
  return VALID_CHANNELS.includes(normalized) ? normalized : fallback;
}

function sanitizeAnchor(value, fallback = "pickup") {
  const normalized = String(value || "").trim().toLowerCase();
  return VALID_ANCHORS.includes(normalized) ? normalized : fallback;
}

function sanitizeTiming(value, fallback = "before") {
  const normalized = String(value || "").trim().toLowerCase();
  return VALID_TIMINGS.includes(normalized) ? normalized : fallback;
}

function sanitizeOffsetMinutes(value, fallback = 60) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(60 * 24 * 30, Math.floor(parsed)));
}

function sanitizeBooleanFlag(value, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1" || value === "true") {
    return true;
  }

  if (value === 0 || value === "0" || value === "false") {
    return false;
  }

  return fallback;
}

function normalizeTemplateRecord(record) {
  return {
    id: Number(record?.id || 0),
    name: sanitizeTemplateText(record?.name, "", 120),
    channel: sanitizeChannel(record?.channel, "email"),
    subject: sanitizeTemplateText(record?.subject, "", 200),
    body: sanitizeTemplateText(record?.body, "", 5000),
    anchor: sanitizeAnchor(record?.anchor, "pickup"),
    timing: sanitizeTiming(record?.timing, "before"),
    offsetMinutes: sanitizeOffsetMinutes(record?.offsetMinutes, 60),
    isActive: sanitizeBooleanFlag(record?.isActive, true),
    createdAt: record?.createdAt || null,
    updatedAt: record?.updatedAt || null,
  };
}

function validateTemplateInput(input = {}) {
  const errors = {};
  const channel = sanitizeChannel(input.channel, "email");
  const anchor = sanitizeAnchor(input.anchor, "pickup");
  const timing = anchor === "midpoint" ? "exact" : sanitizeTiming(input.timing, "before");
  const name = sanitizeTemplateText(input.name, "", 120);
  const subject = sanitizeTemplateText(input.subject, "", 200);
  const body = sanitizeTemplateText(input.body, "", 5000);
  const offsetMinutes = anchor === "midpoint" ? 0 : sanitizeOffsetMinutes(input.offsetMinutes, 60);
  const isActive = sanitizeBooleanFlag(input.isActive, true);

  if (!name) {
    errors.name = "Template name is required";
  }

  if (channel === "email" && !subject) {
    errors.subject = "Email templates require a subject";
  }

  if (!body) {
    errors.body = "Template body is required";
  }

  if (!VALID_CHANNELS.includes(channel)) {
    errors.channel = "Channel must be email or sms";
  }

  if (!VALID_ANCHORS.includes(anchor)) {
    errors.anchor = "Select a valid timing anchor";
  }

  if (anchor !== "midpoint" && !VALID_TIMINGS.includes(timing)) {
    errors.timing = "Select a valid timing";
  }

  if (anchor !== "midpoint" && offsetMinutes < 0) {
    errors.offsetMinutes = "Offset must be zero or greater";
  }

  return {
    errors,
    values: {
      name,
      channel,
      subject,
      body,
      anchor,
      timing,
      offsetMinutes,
      isActive,
    },
  };
}

async function ensureNotificationTemplateTable() {
  await prisma.$executeRawUnsafe(NOTIFICATION_TEMPLATE_TABLE_SQL);
}

async function listNotificationTemplates() {
  await ensureNotificationTemplateTable();

  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM "NotificationTemplates" ORDER BY "createdAt" DESC, "id" DESC'
  );

  return Array.isArray(rows) ? rows.map(normalizeTemplateRecord) : [];
}

async function getNotificationTemplateById(id) {
  await ensureNotificationTemplateTable();

  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM "NotificationTemplates" WHERE "id" = ? LIMIT 1',
    Number(id)
  );

  const template = Array.isArray(rows) ? rows[0] : null;

  if (!template) {
    const error = new Error("Notification template not found");
    error.statusCode = 404;
    throw error;
  }

  return normalizeTemplateRecord(template);
}

async function createNotificationTemplate(input = {}) {
  await ensureNotificationTemplateTable();

  const { errors, values } = validateTemplateInput(input);

  if (Object.keys(errors).length > 0) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "NotificationTemplates" (
        "name",
        "channel",
        "subject",
        "body",
        "anchor",
        "timing",
        "offsetMinutes",
        "isActive",
        "createdAt",
        "updatedAt"
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    values.name,
    values.channel,
    values.subject,
    values.body,
    values.anchor,
    values.timing,
    values.offsetMinutes,
    values.isActive ? 1 : 0
  );

  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM "NotificationTemplates" ORDER BY "id" DESC LIMIT 1'
  );

  return normalizeTemplateRecord(Array.isArray(rows) ? rows[0] : null);
}

async function updateNotificationTemplate(id, input = {}) {
  await ensureNotificationTemplateTable();

  const current = await getNotificationTemplateById(id);
  const mergedInput = {
    ...current,
    ...input,
  };

  const { errors, values } = validateTemplateInput(mergedInput);

  if (Object.keys(errors).length > 0) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }

  await prisma.$executeRawUnsafe(
    `
      UPDATE "NotificationTemplates"
      SET
        "name" = ?,
        "channel" = ?,
        "subject" = ?,
        "body" = ?,
        "anchor" = ?,
        "timing" = ?,
        "offsetMinutes" = ?,
        "isActive" = ?,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ?
    `,
    values.name,
    values.channel,
    values.subject,
    values.body,
    values.anchor,
    values.timing,
    values.offsetMinutes,
    values.isActive ? 1 : 0,
    Number(id)
  );

  return getNotificationTemplateById(id);
}

async function deleteNotificationTemplate(id) {
  await ensureNotificationTemplateTable();
  await getNotificationTemplateById(id);

  await prisma.$executeRawUnsafe(
    'DELETE FROM "NotificationTemplates" WHERE "id" = ?',
    Number(id)
  );
}

module.exports = {
  listNotificationTemplates,
  getNotificationTemplateById,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
};