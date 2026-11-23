const prisma = require('../config/database');
const { updateInvoiceStatus } = require('./invoiceService');

const createPayment = async (organizationId, data) => {
  const { invoiceId, amount, method, provider, reference, paidAt } = data;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  if (amount > invoice.balance) {
    throw new Error('Payment amount exceeds outstanding balance');
  }

  const payment = await prisma.payment.create({
    data: {
      organizationId,
      invoiceId,
      amount,
      currency: invoice.currency,
      method,
      provider: provider || 'OTHER',
      reference,
      status: 'COMPLETED',
      paidAt: paidAt ? new Date(paidAt) : new Date(),
    },
  });

  await prisma.transaction.create({
    data: {
      organizationId,
      type: 'INVOICE_PAYMENT',
      amount,
      currency: invoice.currency,
      source: method,
      reference,
      status: 'COMPLETED',
      invoiceId,
      paymentId: payment.id,
    },
  });

  await updateInvoiceStatus(invoiceId);

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'CREATE',
      entity: 'Payment',
      entityId: payment.id,
      metadata: JSON.stringify({ invoiceId, amount }),
    },
  });

  return payment;
};

const getPayments = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.invoiceId) {
    where.invoiceId = filters.invoiceId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  return await prisma.payment.findMany({
    where,
    include: { invoice: { include: { client: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

const getPaymentById = async (organizationId, id) => {
  return await prisma.payment.findFirst({
    where: { id, organizationId },
    include: { invoice: { include: { client: true } } },
  });
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
};
