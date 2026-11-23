const prisma = require('../config/database');

const createClient = async (organizationId, data) => {
  const client = await prisma.client.create({
    data: {
      ...data,
      organizationId,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'CREATE',
      entity: 'Client',
      entityId: client.id,
      metadata: JSON.stringify({ name: data.name }),
    },
  });

  return client;
};

const getClients = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { email: { contains: filters.search } },
    ];
  }

  return await prisma.client.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

const getClientById = async (organizationId, id) => {
  return await prisma.client.findFirst({
    where: { id, organizationId },
    include: {
      quotes: { orderBy: { createdAt: 'desc' } },
      invoices: {
        include: { payments: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
};

const updateClient = async (organizationId, id, data) => {
  const client = await prisma.client.updateMany({
    where: { id, organizationId },
    data,
  });

  if (client.count === 0) {
    throw new Error('Client not found');
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'UPDATE',
      entity: 'Client',
      entityId: id,
      metadata: JSON.stringify(data),
    },
  });

  return await prisma.client.findUnique({ where: { id } });
};

const deleteClient = async (organizationId, id) => {
  const result = await prisma.client.deleteMany({
    where: { id, organizationId },
  });

  if (result.count === 0) {
    throw new Error('Client not found');
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'DELETE',
      entity: 'Client',
      entityId: id,
    },
  });

  return { success: true };
};

module.exports = {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
};
