// Run with: node scripts/createAdmin.js
// Creates or resets the admin user in the database.

const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@carsgidi.com";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_NAME = "Admin";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

async function main() {
  const passwordHash = hashPassword(ADMIN_PASSWORD);

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash, role: "admin", name: ADMIN_NAME },
    });
    console.log(`Updated existing user: ${ADMIN_EMAIL}`);
  } else {
    await prisma.user.create({
      data: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: "admin",
      },
    });
    console.log(`Created admin user: ${ADMIN_EMAIL}`);
  }

  console.log(`Password: ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
