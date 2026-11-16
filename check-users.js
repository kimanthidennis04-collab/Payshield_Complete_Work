const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({ include: { organization: true } });
  console.log('Existing users:', JSON.stringify(users, null, 2));
  await prisma.$disconnect();
})();
