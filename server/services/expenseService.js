const prisma = require('../config/database');

const createExpense = async (organizationId, data) => {
  const expense = await prisma.expense.create({
    data: {
      ...data,
      organizationId,
      date: data.date ? new Date(data.date) : new Date(),
    },
  });

  await prisma.transaction.create({
    data: {
      organizationId,
      type: 'EXPENSE',
      amount: expense.amount,
      currency: expense.currency,
      source: expense.category,
      reference: expense.description,
      status: 'COMPLETED',
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'CREATE',
      entity: 'Expense',
      entityId: expense.id,
      metadata: JSON.stringify({ category: data.category, amount: data.amount }),
    },
  });

  return expense;
};

const getExpenses = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.startDate) {
    where.date = { ...where.date, gte: new Date(filters.startDate) };
  }

  if (filters.endDate) {
    where.date = { ...where.date, lte: new Date(filters.endDate) };
  }

  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search } },
      { category: { contains: filters.search } },
    ];
  }

  return await prisma.expense.findMany({
    where,
    orderBy: { date: 'desc' },
  });
};

const getExpenseById = async (organizationId, id) => {
  return await prisma.expense.findFirst({
    where: { id, organizationId },
  });
};

const updateExpense = async (organizationId, id, data) => {
  const result = await prisma.expense.updateMany({
    where: { id, organizationId },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    },
  });

  if (result.count === 0) {
    throw new Error('Expense not found');
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'UPDATE',
      entity: 'Expense',
      entityId: id,
      metadata: JSON.stringify(data),
    },
  });

  return await prisma.expense.findUnique({ where: { id } });
};

const deleteExpense = async (organizationId, id) => {
  const result = await prisma.expense.deleteMany({
    where: { id, organizationId },
  });

  if (result.count === 0) {
    throw new Error('Expense not found');
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'DELETE',
      entity: 'Expense',
      entityId: id,
    },
  });

  return { success: true };
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
