const prisma = require('../config/database');

const createDeliverable = async (organizationId, data) => {
  const { invoiceId, name, filePath, fileSize, fileType, isProtected } = data;

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      organizationId,
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const fileSizeNum = typeof fileSize === 'number' ? Math.round(fileSize) : (parseInt(fileSize, 10) || 1024);

  return await prisma.deliverable.create({
    data: {
      organizationId,
      invoiceId,
      name,
      filePath: filePath || 'vault/deliverables/' + name,
      fileSize: fileSizeNum,
      fileType: fileType || 'application/octet-stream',
      isProtected: isProtected !== false,
    },
  });
};

const getDeliverables = async (organizationId, invoiceId) => {
  const where = { organizationId };
  if (invoiceId) {
    where.invoiceId = invoiceId;
  }

  return await prisma.deliverable.findMany({
    where,
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          status: true,
          total: true,
          amountPaid: true,
          balance: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getDeliverable = async (organizationId, deliverableId) => {
  const deliverable = await prisma.deliverable.findFirst({
    where: {
      id: deliverableId,
      organizationId,
    },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          status: true,
          total: true,
          amountPaid: true,
          balance: true,
        },
      },
    },
  });

  if (!deliverable) {
    throw new Error('Deliverable not found');
  }

  return deliverable;
};

const checkAccess = async (organizationId, deliverableId) => {
  const deliverable = await getDeliverable(organizationId, deliverableId);

  if (!deliverable.isProtected) {
    return { allowed: true, reason: 'Not protected' };
  }

  if (deliverable.isUnlocked) {
    return { allowed: true, reason: 'Already unlocked' };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: deliverable.invoiceId },
  });

  if (!invoice) {
    return { allowed: false, reason: 'Invoice not found' };
  }

  if (invoice.status === 'PAID' || invoice.balance === 0) {
    return { allowed: true, reason: 'Invoice fully paid' };
  }

  return { allowed: false, reason: 'Invoice not fully paid' };
};

const unlockDeliverable = async (organizationId, deliverableId, userId) => {
  const deliverable = await getDeliverable(organizationId, deliverableId);

  if (!deliverable.isProtected) {
    throw new Error('Deliverable is not protected');
  }

  if (deliverable.isUnlocked) {
    return deliverable;
  }

  const accessCheck = await checkAccess(organizationId, deliverableId);

  if (!accessCheck.allowed) {
    throw new Error(accessCheck.reason);
  }

  const updated = await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      isUnlocked: true,
      unlockedAt: new Date(),
      unlockedBy: userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action: 'UNLOCK_DELIVERABLE',
      entity: 'Deliverable',
      entityId: deliverableId,
      metadata: JSON.stringify({
        deliverableName: deliverable.name,
        invoiceId: deliverable.invoiceId,
        reason: accessCheck.reason,
      }),
    },
  });

  return updated;
};

const deleteDeliverable = async (organizationId, deliverableId) => {
  const deliverable = await getDeliverable(organizationId, deliverableId);

  await prisma.deliverable.delete({
    where: { id: deliverableId },
  });

  return { message: 'Deliverable deleted' };
};

module.exports = {
  createDeliverable,
  getDeliverables,
  getDeliverable,
  checkAccess,
  unlockDeliverable,
  deleteDeliverable,
};
