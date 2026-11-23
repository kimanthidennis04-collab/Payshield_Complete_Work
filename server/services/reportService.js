const prisma = require('../config/database');

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

const getRevenueReport = async (organizationId, startDate, endDate) => {
  const { start, end } = parseDateRange(startDate, endDate);

  const payments = await prisma.payment.findMany({
    where: {
      organizationId,
      status: 'COMPLETED',
      paidAt: { gte: start, lte: end },
    },
    include: { invoice: { include: { client: true } } },
  });

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    type: 'REVENUE',
    period: { start, end },
    totalRevenue,
    transactionCount: payments.length,
    transactions: payments,
  };
};

const getPaymentsReport = async (organizationId, startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const end = endDate ? new Date(endDate) : new Date();

  const payments = await prisma.payment.findMany({
    where: {
      organizationId,
      paidAt: { gte: start, lte: end },
    },
    include: { invoice: { include: { client: true } } },
    orderBy: { paidAt: 'desc' },
  });

  const byMethod = {};
  payments.forEach(p => {
    byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
  });

  return {
    type: 'PAYMENTS',
    period: { start, end },
    totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
    count: payments.length,
    byMethod,
    payments,
  };
};

const getOutstandingInvoicesReport = async (organizationId) => {
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
    },
    include: { client: true, payments: true },
  });

  const report = invoices.map(inv => {
    const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    return {
      invoiceNumber: inv.invoiceNumber,
      client: inv.client.name,
      total: inv.total,
      amountPaid: paid,
      balance: inv.total - paid,
      status: inv.status,
      dueDate: inv.dueDate,
      daysOverdue: inv.dueDate ? Math.max(0, Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24))) : 0,
    };
  });

  const totalOutstanding = report.reduce((sum, r) => sum + r.balance, 0);

  return {
    type: 'OUTSTANDING_INVOICES',
    count: report.length,
    totalOutstanding,
    invoices: report,
  };
};

const getOverdueInvoicesReport = async (organizationId) => {
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      dueDate: { lt: new Date() },
      status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
    },
    include: { client: true, payments: true },
  });

  const report = invoices.map(inv => {
    const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    return {
      invoiceNumber: inv.invoiceNumber,
      client: inv.client.name,
      total: inv.total,
      amountPaid: paid,
      balance: inv.total - paid,
      dueDate: inv.dueDate,
      daysOverdue: Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)),
    };
  });

  const totalOverdue = report.reduce((sum, r) => sum + r.balance, 0);

  return {
    type: 'OVERDUE_INVOICES',
    count: report.length,
    totalOverdue,
    invoices: report,
  };
};

const getExpensesReport = async (organizationId, startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const end = endDate ? new Date(endDate) : new Date();

  const expenses = await prisma.expense.findMany({
    where: {
      organizationId,
      date: { gte: start, lte: end },
    },
    orderBy: { date: 'desc' },
  });

  const byCategory = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    type: 'EXPENSES',
    period: { start, end },
    totalExpenses,
    count: expenses.length,
    byCategory,
    expenses,
  };
};

const getClientBalancesReport = async (organizationId) => {
  const clients = await prisma.client.findMany({
    where: { organizationId },
    include: {
      invoices: {
        include: { payments: true },
      },
    },
  });

  const report = clients.map(client => {
    let totalBalance = 0;
    let totalPaid = 0;

    client.invoices.forEach(inv => {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      totalPaid += paid;
      if (inv.status !== 'PAID' && inv.status !== 'CANCELLED') {
        totalBalance += (inv.total - paid);
      }
    });

    return {
      clientName: client.name,
      clientEmail: client.email,
      totalInvoices: client.invoices.length,
      totalPaid,
      totalBalance,
    };
  });

  return {
    type: 'CLIENT_BALANCES',
    clients: report,
    totalOutstanding: report.reduce((sum, r) => sum + r.totalBalance, 0),
  };
};

const getTransactionHistory = async (organizationId, startDate, endDate, limit = 100) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const end = endDate ? new Date(endDate) : new Date();

  const transactions = await prisma.transaction.findMany({
    where: {
      organizationId,
      createdAt: { gte: start, lte: end },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return {
    type: 'TRANSACTION_HISTORY',
    period: { start, end },
    count: transactions.length,
    transactions,
  };
};

module.exports = {
  getRevenueReport,
  getPaymentsReport,
  getOutstandingInvoicesReport,
  getOverdueInvoicesReport,
  getExpensesReport,
  getClientBalancesReport,
  getTransactionHistory,
};
