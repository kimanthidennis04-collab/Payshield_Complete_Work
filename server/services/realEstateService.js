const prisma = require('../config/database');

const createProperty = async (organizationId, data) => {
  return await prisma.property.create({
    data: {
      ...data,
      organizationId,
    },
  });
};

const getProperties = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.propertyType) {
    where.propertyType = filters.propertyType;
  }

  return await prisma.property.findMany({
    where,
    include: {
      units: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getProperty = async (organizationId, propertyId) => {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      organizationId,
    },
    include: {
      units: {
        include: {
          tenancies: {
            include: {
              tenant: true,
            },
          },
        },
      },
    },
  });

  if (!property) {
    throw new Error('Property not found');
  }

  return property;
};

const createPropertyUnit = async (organizationId, data) => {
  const property = await prisma.property.findFirst({
    where: {
      id: data.propertyId,
      organizationId,
    },
  });

  if (!property) {
    throw new Error('Property not found');
  }

  return await prisma.propertyUnit.create({
    data: {
      ...data,
      organizationId,
    },
  });
};

const getPropertyUnits = async (organizationId, propertyId) => {
  const where = { organizationId };
  if (propertyId) {
    where.propertyId = propertyId;
  }

  return await prisma.propertyUnit.findMany({
    where,
    include: {
      property: true,
      tenancies: {
        include: {
          tenant: true,
        },
      },
    },
    orderBy: { unitNumber: 'asc' },
  });
};

const createTenant = async (organizationId, data) => {
  return await prisma.tenant.create({
    data: {
      ...data,
      organizationId,
    },
  });
};

const getTenants = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { email: { contains: filters.search } },
      { phone: { contains: filters.search } },
    ];
  }

  return await prisma.tenant.findMany({
    where,
    include: {
      tenancies: {
        include: {
          propertyUnit: {
            include: {
              property: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
};

const createTenancy = async (organizationId, data) => {
  const { propertyUnitId, tenantId, startDate, endDate, rentAmount, depositAmount } = data;

  const unit = await prisma.propertyUnit.findFirst({
    where: {
      id: propertyUnitId,
      organizationId,
    },
  });

  if (!unit) {
    throw new Error('Property unit not found');
  }

  if (unit.status !== 'AVAILABLE') {
    throw new Error('Property unit is not available');
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      organizationId,
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const tenancy = await prisma.tenancy.create({
    data: {
      organizationId,
      propertyUnitId,
      tenantId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      rentAmount,
      depositAmount,
    },
  });

  await prisma.propertyUnit.update({
    where: { id: propertyUnitId },
    data: { status: 'OCCUPIED' },
  });

  return tenancy;
};

const getTenancies = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.propertyId) {
    where.propertyUnit = {
      propertyId: filters.propertyId,
    };
  }

  return await prisma.tenancy.findMany({
    where,
    include: {
      propertyUnit: {
        include: {
          property: true,
        },
      },
      tenant: true,
      rentInvoices: true,
    },
    orderBy: { startDate: 'desc' },
  });
};

const createRentInvoice = async (organizationId, data) => {
  const { tenancyId, rentPeriod, dueDate, amount } = data;

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id: tenancyId,
      organizationId,
    },
    include: {
      propertyUnit: {
        include: {
          property: true,
        },
      },
    },
  });

  if (!tenancy) {
    throw new Error('Tenancy not found');
  }

  const lastInvoice = await prisma.rentInvoice.findFirst({
    orderBy: { createdAt: 'desc' },
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
  const invoiceNumber = `RENT-${String(nextNumber).padStart(4, '0')}`;

  return await prisma.rentInvoice.create({
    data: {
      organizationId,
      tenancyId,
      invoiceNumber,
      rentPeriod,
      dueDate: new Date(dueDate),
      amount,
      balance: amount,
    },
  });
};

const getRentInvoices = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.tenancyId) {
    where.tenancyId = filters.tenancyId;
  }

  return await prisma.rentInvoice.findMany({
    where,
    include: {
      tenancy: {
        include: {
          tenant: true,
          propertyUnit: {
            include: {
              property: true,
            },
          },
        },
      },
      payments: true,
    },
    orderBy: { dueDate: 'desc' },
  });
};

const createRentPayment = async (organizationId, data) => {
  const { rentInvoiceId, amount, method, reference } = data;

  const invoice = await prisma.rentInvoice.findFirst({
    where: {
      id: rentInvoiceId,
      organizationId,
    },
  });

  if (!invoice) {
    throw new Error('Rent invoice not found');
  }

  if (amount > invoice.balance) {
    throw new Error('Payment amount exceeds outstanding balance');
  }

  const payment = await prisma.rentPayment.create({
    data: {
      organizationId,
      rentInvoiceId,
      amount,
      method,
      reference,
      paidAt: new Date(),
      status: 'COMPLETED',
    },
  });

  const totalPaid = invoice.amountPaid + amount;
  const newBalance = invoice.balance - amount;
  const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

  await prisma.rentInvoice.update({
    where: { id: rentInvoiceId },
    data: {
      amountPaid: totalPaid,
      balance: newBalance,
      status: newStatus,
    },
  });

  return payment;
};

const getRentPayments = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.rentInvoiceId) {
    where.rentInvoiceId = filters.rentInvoiceId;
  }

  return await prisma.rentPayment.findMany({
    where,
    include: {
      rentInvoice: {
        include: {
          tenancy: {
            include: {
              tenant: true,
            },
          },
        },
      },
    },
    orderBy: { paidAt: 'desc' },
  });
};

const getRealEstateReport = async (organizationId, filters = {}) => {
  const { startDate, endDate } = filters;

  const dateFilter = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate);
  }

  const properties = await prisma.property.findMany({
    where: { organizationId },
    include: {
      units: true,
    },
  });

  const tenants = await prisma.tenant.count({
    where: { organizationId },
  });

  const activeTenancies = await prisma.tenancy.count({
    where: {
      organizationId,
      status: 'ACTIVE',
    },
  });

  const rentInvoices = await prisma.rentInvoice.findMany({
    where: {
      organizationId,
      ...(Object.keys(dateFilter).length > 0 ? { dueDate: dateFilter } : {}),
    },
  });

  const totalExpectedRent = rentInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCollectedRent = rentInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalOutstandingRent = rentInvoices.reduce((sum, inv) => sum + inv.balance, 0);

  const overdueRentInvoices = rentInvoices.filter(
    inv => inv.status !== 'PAID' && new Date(inv.dueDate) < new Date()
  );
  const totalOverdueRent = overdueRentInvoices.reduce((sum, inv) => sum + inv.balance, 0);

  return {
    summary: {
      totalProperties: properties.length,
      totalUnits: properties.reduce((sum, p) => sum + p.units.length, 0),
      totalTenants: tenants,
      activeTenancies,
    },
    financials: {
      totalExpectedRent,
      totalCollectedRent,
      totalOutstandingRent,
      totalOverdueRent,
      collectionRate: totalExpectedRent > 0 ? (totalCollectedRent / totalExpectedRent) * 100 : 0,
    },
    properties: properties.map(p => ({
      id: p.id,
      name: p.name,
      type: p.propertyType,
      totalUnits: p.units.length,
      occupiedUnits: p.units.filter(u => u.status === 'OCCUPIED').length,
      availableUnits: p.units.filter(u => u.status === 'AVAILABLE').length,
    })),
  };
};

module.exports = {
  createProperty,
  getProperties,
  getProperty,
  createPropertyUnit,
  getPropertyUnits,
  createTenant,
  getTenants,
  createTenancy,
  getTenancies,
  createRentInvoice,
  getRentInvoices,
  createRentPayment,
  getRentPayments,
  getRealEstateReport,
};
