const prisma = require('../config/database');

const generateQuoteNumber = async (organizationId) => {
  const lastQuote = await prisma.quote.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  let nextNumber = 1;
  if (lastQuote && lastQuote.quoteNumber) {
    const parts = lastQuote.quoteNumber.split('-');
    if (parts.length > 1) {
      const lastNumber = parseInt(parts[1]);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
  }
  return `QT-${String(nextNumber).padStart(4, '0')}`;
};

const calculateQuoteFinancials = (items, options = {}) => {
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

const createQuote = async (organizationId, data) => {
  const { items = [], ...quoteData } = data;

  const quoteNumber = quoteData.quoteNumber || await generateQuoteNumber(organizationId);

  const { subtotal, tax, total } = calculateQuoteFinancials(items, {
    taxRate: quoteData.taxRate,
    pricingType: quoteData.pricingType,
    taxExempt: quoteData.taxExempt,
  });

  const quote = await prisma.quote.create({
    data: {
      organizationId,
      clientId: quoteData.clientId,
      quoteNumber,
      status: quoteData.status || 'DRAFT',
      subtotal,
      tax,
      total,
      notes: quoteData.notes || null,
      validUntil: quoteData.validUntil ? new Date(quoteData.validUntil) : null,
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
    include: { items: true, client: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'CREATE',
      entity: 'Quote',
      entityId: quote.id,
      metadata: JSON.stringify({ quoteNumber, total }),
    },
  });

  return quote;
};

const getQuotes = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      { quoteNumber: { contains: filters.search } },
      { client: { name: { contains: filters.search } } }
    ];
  }

  return await prisma.quote.findMany({
    where,
    include: { client: true, items: true },
    orderBy: { createdAt: 'desc' },
  });
};

const getQuoteById = async (organizationId, id) => {
  return await prisma.quote.findFirst({
    where: { id, organizationId },
    include: { client: true, items: { include: { service: true } } },
  });
};

const updateQuote = async (organizationId, id, data) => {
  const { items, ...quoteData } = data;

  const existingQuote = await prisma.quote.findFirst({
    where: { id, organizationId },
    include: { items: true },
  });

  if (!existingQuote) {
    throw new Error('Quote not found');
  }

  let subtotal = existingQuote.subtotal;
  let tax = existingQuote.tax;
  let total = existingQuote.total;

  if (items && Array.isArray(items)) {
    const calc = calculateQuoteFinancials(items, {
      taxRate: quoteData.taxRate,
      pricingType: quoteData.pricingType,
      taxExempt: quoteData.taxExempt,
    });
    subtotal = calc.subtotal;
    tax = calc.tax;
    total = calc.total;

    await prisma.quoteItem.deleteMany({ where: { quoteId: id } });
    await prisma.quoteItem.createMany({
      data: items.map(item => ({
        quoteId: id,
        serviceId: item.serviceId || null,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        total: Number((Number(item.quantity) * Number(item.unitPrice)).toFixed(2)),
      })),
    });
  }

  const updatedQuote = await prisma.quote.update({
    where: { id },
    data: {
      clientId: quoteData.clientId || existingQuote.clientId,
      status: quoteData.status || existingQuote.status,
      subtotal,
      tax,
      total,
      notes: quoteData.notes !== undefined ? quoteData.notes : existingQuote.notes,
      validUntil: quoteData.validUntil !== undefined ? (quoteData.validUntil ? new Date(quoteData.validUntil) : null) : existingQuote.validUntil,
    },
    include: { items: true, client: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'UPDATE',
      entity: 'Quote',
      entityId: id,
      metadata: JSON.stringify({ quoteNumber: updatedQuote.quoteNumber, total }),
    },
  });

  return updatedQuote;
};

const deleteQuote = async (organizationId, id) => {
  const result = await prisma.quote.deleteMany({
    where: { id, organizationId },
  });

  if (result.count === 0) {
    throw new Error('Quote not found');
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'DELETE',
      entity: 'Quote',
      entityId: id,
    },
  });

  return { success: true };
};

const convertQuoteToInvoice = async (organizationId, quoteId) => {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId },
    include: { items: true, client: true },
  });

  if (!quote) {
    throw new Error('Quote not found');
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const currency = (org && org.currency) ? org.currency : 'USD';

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
  const invoiceNumber = `INV-${String(nextNumber).padStart(4, '0')}`;

  const invoice = await prisma.invoice.create({
    data: {
      organizationId,
      clientId: quote.clientId,
      invoiceNumber,
      status: 'PENDING',
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      balance: quote.total,
      currency,
      notes: quote.notes ? `Converted from Quote ${quote.quoteNumber}. ${quote.notes}` : `Converted from Quote ${quote.quoteNumber}`,
      items: {
        create: quote.items.map(item => ({
          serviceId: item.serviceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      },
    },
    include: { items: true, client: true },
  });

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'ACCEPTED' },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'CONVERT',
      entity: 'Quote',
      entityId: quoteId,
      metadata: JSON.stringify({ toInvoice: invoice.id, invoiceNumber }),
    },
  });

  return invoice;
};

module.exports = {
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuote,
  deleteQuote,
  convertQuoteToInvoice,
  calculateQuoteFinancials,
};
