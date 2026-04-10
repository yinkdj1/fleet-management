const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vehicles = await prisma.vehicle.findMany();
  console.log('Vehicles:', vehicles);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
