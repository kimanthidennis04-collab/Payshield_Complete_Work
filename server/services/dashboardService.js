const prisma = require('../config/database');

const getDashboardMetrics = async (organizationId) => {
  const [
    totalRevenue,
    totalPayments,
    invoices,
    clients,
    quotes,
    expenses,
    recentInvoices,
    recentPayments,
    recentTransactions,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { organizationId, status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: { organizationId, status: 'COMPLETED' },
    }),
    prisma.invoice.findMany({
      where: { organizationId },
      include: { payments: true },
    }),
    prisma.client.count({
      where: { organizationId },
    }),
    prisma.quote.count({
      where: { organizationId },
    }),
    prisma.expense.aggregate({
      where: { organizationId },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      where: { organizationId },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.payment.findMany({
      where: { organizationId },
      include: { invoice: { include: { client: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.transaction.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  let outstandingInvoices = 0;
  let overdueInvoices = 0;
  let pendingInvoices = 0;
  let totalOutstanding = 0;

  invoices.forEach(invoice => {
    const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = invoice.total - paid;

    if (invoice.status !== 'PAID' && invoice.status !== 'CANCELLED') {
      outstandingInvoices++;
      totalOutstanding += balance;

      if (invoice.status === 'PENDING') {
        pendingInvoices++;
      }

      if (invoice.status === 'OVERDUE' || (invoice.dueDate && new Date(invoice.dueDate) < new Date())) {
        overdueInvoices++;
      }
    }
  });

  const totalRevenueAmount = totalRevenue._sum.amount || 0;
  const totalExpensesAmount = expenses._sum.amount || 0;
  const netCashFlow = totalRevenueAmount - totalExpensesAmount;

  return {
    totalRevenue: totalRevenueAmount,
    totalPayments,
    outstandingInvoices,
    overdueInvoices,
    pendingInvoices,
    totalOutstanding,
    clientCount: clients,
    invoiceCount: invoices.length,
    quoteCount: quotes,
    totalExpenses: totalExpensesAmount,
    netCashFlow,
    recentInvoices,
    recentPayments,
    recentTransactions,
  };
};

const parseDateRange = (startDate, endDate) => {
  let start;
  let end;

  if (startDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      start = new Date(`${startDate}T00:00:00.000Z`);
    } else {
      start = new Date(startDate);
    }
  } else {
    start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  if (endDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      end = new Date(`${endDate}T23:59:59.999Z`);
    } else {
      end = new Date(endDate);
    }
  } else {
    end = new Date();
  }

  return { start, end };
};

const getCashFlowMetrics = async (organizationId, startDate, endDate) => {
  const { start, end } = parseDateRange(startDate, endDate);

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        paidAt: { gte: start, lte: end },
      },
    }),
    prisma.expense.findMany({
      where: {
        organizationId,
        date: { gte: start, lte: end },
      },
    }),
  ]);

  const moneyReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      createdAt: { gte: start, lte: end },
    },
    include: { payments: true },
  });

  let outstandingReceivables = 0;
  let overdueReceivables = 0;

  invoices.forEach(invoice => {
    const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = invoice.total - paid;

    if (invoice.status !== 'PAID' && invoice.status !== 'CANCELLED') {
      outstandingReceivables += balance;

      if (invoice.status === 'OVERDUE' || (invoice.dueDate && new Date(invoice.dueDate) < new Date())) {
        overdueReceivables += balance;
      }
    }
  });

  const netCashFlow = moneyReceived - totalExpenses;

  return {
    moneyReceived,
    totalExpenses,
    outstandingReceivables,
    overdueReceivables,
    netCashFlow,
    startDate: start,
    endDate: end,
  };
};

module.exports = {
  getDashboardMetrics,
  getCashFlowMetrics,
};
