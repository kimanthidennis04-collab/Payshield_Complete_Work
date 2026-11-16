const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const orgId = '9d2d2a22-64d7-4281-b011-295676e478ea';

  const [clients, invoices, payments, expenses] = await Promise.all([
    prisma.client.count({ where: { organizationId: orgId } }),
    prisma.invoice.count({ where: { organizationId: orgId } }),
    prisma.payment.count({ where: { organizationId: orgId } }),
    prisma.expense.count({ where: { organizationId: orgId } }),
  ]);

  console.log('Organization: Tsunza Realtors');
  console.log('Clients:', clients);
  console.log('Invoices:', invoices);
  console.log('Payments:', payments);
  console.log('Expenses:', expenses);

  await prisma.$disconnect();
})();
