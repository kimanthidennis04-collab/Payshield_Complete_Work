const prisma = require('../config/database');

const generateInvoiceNumber = async (organizationId) => {
  const lastInvoice = await prisma.invoice.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  let nextNumber = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const parts = lastInvoice.invoiceNumber.split('-');
    if (parts.length > 1) {
      const lastNumber = parseInt(parts[1]);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
  }
  return `INV-${String(nextNumber).padStart(4, '0')}`;
};

const calculateInvoiceFinancials = (items, options = {}) => {
  const taxRate = options.taxExempt ? 0 : (options.taxRate !== undefined ? Number(options.taxRate) : 0.16);
  const pricingType = options.pricingType || 'EXCLUSIVE';

  let rawSum = 0;
  items.forEach(item => {
    rawSum += Number(item.quantity) * Number(item.unitPrice);
  });

  let subtotal, tax, total;
  if (options.taxExempt) {
    subtotal = Number(rawSum.toFixed(2));
    tax = 0;
    total = Number(rawSum.toFixed(2));
  } else if (pricingType === 'INCLUSIVE') {
    total = Number(rawSum.toFixed(2));
    subtotal = Number((total / (1 + taxRate)).toFixed(2));
    tax = Number((total - subtotal).toFixed(2));
  } else {
    subtotal = Number(rawSum.toFixed(2));
    tax = Number((subtotal * taxRate).toFixed(2));
    total = Number((subtotal + tax).toFixed(2));
  }

  return { subtotal, tax, total, taxRate, pricingType };
};

const createInvoice = async (organizationId, data) => {
  const { items = [], ...invoiceData } = data;

  const invoiceNumber = invoiceData.invoiceNumber || await generateInvoiceNumber(organizationId);
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const currency = invoiceData.currency || (org ? org.currency : 'USD');

  const { subtotal, tax, total } = calculateInvoiceFinancials(items, {
    taxRate: invoiceData.taxRate,
    pricingType: invoiceData.pricingType,
    taxExempt: invoiceData.taxExempt,
  });

  const invoice = await prisma.invoice.create({
    data: {
      organizationId,
      clientId: invoiceData.clientId,
      invoiceNumber,
      currency,
      status: invoiceData.status || 'PENDING',
      subtotal,
      tax,
      total,
      amountPaid: 0,
      balance: total,
      dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : null,
      notes: invoiceData.notes || null,
      items: {
        create: items.map(item => ({
          serviceId: item.serviceId || null,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number((Number(item.quantity) * Number(item.unitPrice)).toFixed(2)),
        })),
      },
    },
    include: { items: true, client: true, payments: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'CREATE',
      entity: 'Invoice',
      entityId: invoice.id,
      metadata: JSON.stringify({ invoiceNumber, total }),
    },
  });

  return invoice;
};

const getInvoices = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      { invoiceNumber: { contains: filters.search } },
      { client: { name: { contains: filters.search } } }
    ];
  }

  return await prisma.invoice.findMany({
    where,
    include: { client: true, items: true, payments: true, deliverables: true },
    orderBy: { createdAt: 'desc' },
  });
};

const getInvoiceById = async (organizationId, id) => {
  return await prisma.invoice.findFirst({
    where: { id, organizationId },
    include: {
      client: true,
      items: { include: { service: true } },
      payments: { orderBy: { paidAt: 'desc' } },
      deliverables: true,
    },
  });
};

const updateInvoice = async (organizationId, id, data) => {
  const { items, ...invoiceData } = data;

  const existingInvoice = await prisma.invoice.findFirst({
    where: { id, organizationId },
    include: { payments: true, items: true },
  });

  if (!existingInvoice) {
    throw new Error('Invoice not found');
  }

  let subtotal = existingInvoice.subtotal;
  let tax = existingInvoice.tax;
  let total = existingInvoice.total;

  if (items && Array.isArray(items)) {
    const calc = calculateInvoiceFinancials(items, {
      taxRate: invoiceData.taxRate,
      pricingType: invoiceData.pricingType,
      taxExempt: invoiceData.taxExempt,
    });
    subtotal = calc.subtotal;
    tax = calc.tax;
    total = calc.total;

    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
    await prisma.invoiceItem.createMany({
      data: items.map(item => ({
        invoiceId: id,
        serviceId: item.serviceId || null,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        total: Number((Number(item.quantity) * Number(item.unitPrice)).toFixed(2)),
      })),
    });
  }

  const completedPayments = existingInvoice.payments.filter(p => p.status === 'COMPLETED');
  const amountPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, total - amountPaid);

  let status = invoiceData.status || existingInvoice.status;
  if (amountPaid >= total && total > 0) {
    status = 'PAID';
  } else if (amountPaid > 0) {
    status = 'PARTIAL';
  }

  const updatedInvoice = await prisma.invoice.update({
    where: { id },
    data: {
      clientId: invoiceData.clientId || existingInvoice.clientId,
      currency: invoiceData.currency || existingInvoice.currency,
      subtotal,
      tax,
      total,
      amountPaid,
      balance,
      status,
      dueDate: invoiceData.dueDate !== undefined ? (invoiceData.dueDate ? new Date(invoiceData.dueDate) : null) : existingInvoice.dueDate,
      notes: invoiceData.notes !== undefined ? invoiceData.notes : existingInvoice.notes,
    },
    include: { items: true, client: true, payments: true, deliverables: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'UPDATE',
      entity: 'Invoice',
      entityId: id,
      metadata: JSON.stringify({ invoiceNumber: updatedInvoice.invoiceNumber, total }),
    },
  });

  return updatedInvoice;
};

const deleteInvoice = async (organizationId, id) => {
  const result = await prisma.invoice.deleteMany({
    where: { id, organizationId },
  });

  if (result.count === 0) {
    throw new Error('Invoice not found');
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'DELETE',
      entity: 'Invoice',
      entityId: id,
    },
  });

  return { success: true };
};

const updateInvoiceStatus = async (invoiceId) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) {
    return;
  }

  const completedPayments = invoice.payments.filter(p => p.status === 'COMPLETED');
  const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, invoice.total - totalPaid);

  let status = invoice.status;

  if (totalPaid >= invoice.total && invoice.total > 0) {
    status = 'PAID';
  } else if (totalPaid > 0) {
    status = 'PARTIAL';
  } else if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
    status = 'OVERDUE';
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid: totalPaid,
      balance,
      status,
    },
  });

  // PayShield Deliverable Shield release logic: automatically unlock deliverables when invoice is fully paid
  if (status === 'PAID') {
    await prisma.deliverable.updateMany({
      where: { invoiceId, isProtected: true, isUnlocked: false },
      data: {
        isUnlocked: true,
        unlockedAt: new Date(),
        unlockedBy: 'PAYMENT_VERIFIED_AUTO',
      },
    });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  calculateInvoiceFinancials,
};
