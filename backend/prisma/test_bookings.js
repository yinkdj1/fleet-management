const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { pickupDatetime: { lte: new Date('2026-05-05T23:59:59Z') }, returnDatetime: { gte: new Date('2026-05-03T00:00:00Z') } },
      ],
    },
    include: { vehicle: true, customer: true },
    orderBy: { pickupDatetime: 'asc' },
  });
  console.log('Bookings overlapping May 3-5, 2026:', bookings);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
