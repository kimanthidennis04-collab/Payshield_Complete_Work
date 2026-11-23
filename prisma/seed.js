const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const hashedPassword = await bcrypt.hash('demo123', 10);

  const organization = await prisma.organization.create({
    data: {
      name: 'Demo Organization',
      country: 'Kenya',
      currency: 'KES',
      timezone: 'Africa/Nairobi',
      email: 'demo@payshield.com',
      phone: '+254700000000',
      address: 'Nairobi, Kenya',
    },
  });

  console.log('Created organization:', organization.name);

  const user = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'demo@payshield.com',
      password: hashedPassword,
      role: 'OWNER',
      organizationId: organization.id,
    },
  });

  console.log('Created user:', user.email);

  const clients = await Promise.all([
    prisma.client.create({
      data: {
        organizationId: organization.id,
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        phone: '+254711111111',
        address: 'Nairobi, Kenya',
        country: 'Kenya',
      },
    }),
    prisma.client.create({
      data: {
        organizationId: organization.id,
        name: 'Tech Solutions Ltd',
        email: 'info@techsolutions.com',
        phone: '+254722222222',
        address: 'Mombasa, Kenya',
        country: 'Kenya',
      },
    }),
    prisma.client.create({
      data: {
        organizationId: organization.id,
        name: 'Global Industries',
        email: 'sales@globalind.com',
        phone: '+254733333333',
        address: 'Kisumu, Kenya',
        country: 'Kenya',
      },
    }),
  ]);

  console.log(`Created ${clients.length} clients`);

  const services = await Promise.all([
    prisma.service.create({
      data: {
        organizationId: organization.id,
        name: 'Web Development',
        description: 'Custom website development',
        price: 50000,
        currency: 'KES',
      },
    }),
    prisma.service.create({
      data: {
        organizationId: organization.id,
        name: 'Mobile App Development',
        description: 'iOS and Android app development',
        price: 150000,
        currency: 'KES',
      },
    }),
    prisma.service.create({
      data: {
        organizationId: organization.id,
        name: 'Consulting',
        description: 'Business consulting services',
        price: 25000,
        currency: 'KES',
      },
    }),
  ]);

  console.log(`Created ${services.length} services`);

  const quote = await prisma.quote.create({
    data: {
      organizationId: organization.id,
      clientId: clients[0].id,
      quoteNumber: 'QT-0001',
      status: 'ACCEPTED',
      subtotal: 75000,
      tax: 12000,
      total: 87000,
      notes: 'Quote for web development project',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            serviceId: services[0].id,
            description: 'Web Development',
            quantity: 1,
            unitPrice: 50000,
            total: 50000,
          },
          {
            serviceId: services[2].id,
            description: 'Consulting',
            quantity: 1,
            unitPrice: 25000,
            total: 25000,
          },
        ],
      },
    },
  });

  console.log('Created quote:', quote.quoteNumber);

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: organization.id,
      clientId: clients[1].id,
      invoiceNumber: 'INV-0001',
      status: 'PARTIAL',
      subtotal: 150000,
      tax: 24000,
      total: 174000,
      amountPaid: 87000,
      balance: 87000,
      currency: 'KES',
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      notes: 'Invoice for mobile app development',
      items: {
        create: [
          {
            serviceId: services[1].id,
            description: 'Mobile App Development',
            quantity: 1,
            unitPrice: 150000,
            total: 150000,
          },
        ],
      },
    },
  });

  console.log('Created invoice:', invoice.invoiceNumber);

  const payment = await prisma.payment.create({
    data: {
      organizationId: organization.id,
      invoiceId: invoice.id,
      amount: 87000,
      currency: 'KES',
      method: 'BANK_TRANSFER',
      provider: 'BANK',
      reference: 'BANK-REF-001',
      status: 'COMPLETED',
      paidAt: new Date(),
    },
  });

  console.log('Created payment:', payment.reference);

  await prisma.transaction.create({
    data: {
      organizationId: organization.id,
      type: 'INVOICE_PAYMENT',
      amount: 87000,
      currency: 'KES',
      source: 'BANK_TRANSFER',
      reference: 'BANK-REF-001',
      status: 'COMPLETED',
      invoiceId: invoice.id,
      paymentId: payment.id,
    },
  });

  const expenses = await Promise.all([
    prisma.expense.create({
      data: {
        organizationId: organization.id,
        category: 'Office',
        description: 'Office rent',
        amount: 30000,
        currency: 'KES',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.expense.create({
      data: {
        organizationId: organization.id,
        category: 'Software',
        description: 'Software licenses',
        amount: 15000,
        currency: 'KES',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.expense.create({
      data: {
        organizationId: organization.id,
        category: 'Utilities',
        description: 'Internet and electricity',
        amount: 8000,
        currency: 'KES',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  console.log(`Created ${expenses.length} expenses`);

  const insight = await prisma.aIInsight.create({
    data: {
      organizationId: organization.id,
      type: 'CASH_FLOW',
      title: 'Healthy Cash Flow',
      content: 'Your business metrics are within healthy ranges. Continue monitoring payments and expenses.',
      severity: 'INFO',
    },
  });

  console.log('Created AI insight');

  console.log('Seed completed successfully!');
  console.log('\nDemo credentials:');
  console.log('Email: demo@payshield.com');
  console.log('Password: demo123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
