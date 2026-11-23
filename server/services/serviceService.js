const prisma = require('../config/database');

const createService = async (organizationId, data) => {
  const service = await prisma.service.create({
    data: {
      ...data,
      organizationId,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'CREATE',
      entity: 'Service',
      entityId: service.id,
      metadata: JSON.stringify({ name: data.name }),
    },
  });

  return service;
};

const getServices = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { description: { contains: filters.search } },
    ];
  }

  return await prisma.service.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

const getServiceById = async (organizationId, id) => {
  return await prisma.service.findFirst({
    where: { id, organizationId },
  });
};

const updateService = async (organizationId, id, data) => {
  const result = await prisma.service.updateMany({
    where: { id, organizationId },
    data,
  });

  if (result.count === 0) {
    throw new Error('Service not found');
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'UPDATE',
      entity: 'Service',
      entityId: id,
      metadata: JSON.stringify(data),
    },
  });

  return await prisma.service.findUnique({ where: { id } });
};

const deleteService = async (organizationId, id) => {
  const result = await prisma.service.deleteMany({
    where: { id, organizationId },
  });

  if (result.count === 0) {
    throw new Error('Service not found');
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'DELETE',
      entity: 'Service',
      entityId: id,
    },
  });

  return { success: true };
};

module.exports = {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
};
