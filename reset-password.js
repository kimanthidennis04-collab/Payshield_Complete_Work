const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('./server/utils/auth');
const prisma = new PrismaClient();

const email = process.argv[2];
const newPassword = process.argv[3];

(async () => {
  if (!email || !newPassword) {
    console.log('Usage: node reset-password.js <email> <newPassword>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.log('User not found:', email);
    process.exit(1);
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  console.log('Password updated and securely hashed for:', email);
  console.log('You can now log in with the new password.');

  await prisma.$disconnect();
})();
