const {
  getRevenueReport,
  getPaymentsReport,
  getOutstandingInvoicesReport,
  getOverdueInvoicesReport,
  getExpensesReport,
  getClientBalancesReport,
  getTransactionHistory,
} = require('../services/reportService');

const revenue = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await getRevenueReport(req.user.organizationId, startDate, endDate);
    // Align properties with frontend expectations
    const alignedRevenue = {
      totalRevenue: report.totalRevenue || 0,
      paymentCount: report.transactionCount || (report.transactions ? report.transactions.length : 0),
      payments: report.transactions || [],
    };
    res.json({ success: true, report, revenue: alignedRevenue });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ error: 'Failed to generate revenue report' });
  }
};

const payments = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await getPaymentsReport(req.user.organizationId, startDate, endDate);
    res.json({ success: true, report, payments: report.payments });
  } catch (error) {
    console.error('Payments report error:', error);
    res.status(500).json({ error: 'Failed to generate payments report' });
  }
};

const outstandingInvoices = async (req, res) => {
  try {
    const report = await getOutstandingInvoicesReport(req.user.organizationId);
    const aligned = {
      totalOutstanding: report.totalOutstanding || 0,
      invoiceCount: report.count || (report.invoices ? report.invoices.length : 0),
      invoices: report.invoices || [],
    };
    res.json({ success: true, report, outstanding: aligned });
  } catch (error) {
    console.error('Outstanding invoices report error:', error);
    res.status(500).json({ error: 'Failed to generate outstanding invoices report' });
  }
};

const overdueInvoices = async (req, res) => {
  try {
    const report = await getOverdueInvoicesReport(req.user.organizationId);
    const aligned = {
      totalOverdue: report.totalOverdue || 0,
      invoiceCount: report.count || (report.invoices ? report.invoices.length : 0),
      invoices: report.invoices || [],
    };
    res.json({ success: true, report, overdue: aligned });
  } catch (error) {
    console.error('Overdue invoices report error:', error);
    res.status(500).json({ error: 'Failed to generate overdue invoices report' });
  }
};

const expenses = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await getExpensesReport(req.user.organizationId, startDate, endDate);
    const aligned = {
      totalExpenses: report.totalExpenses || 0,
      expenseCount: report.count || (report.expenses ? report.expenses.length : 0),
      expenses: report.expenses || [],
    };
    res.json({ success: true, report, expenses: aligned });
  } catch (error) {
    console.error('Expenses report error:', error);
    res.status(500).json({ error: 'Failed to generate expenses report' });
  }
};

const clientBalances = async (req, res) => {
  try {
    const report = await getClientBalancesReport(req.user.organizationId);
    res.json({ success: true, report, balances: report.clients || [] });
  } catch (error) {
    console.error('Client balances report error:', error);
    res.status(500).json({ error: 'Failed to generate client balances report' });
  }
};

const transactionHistory = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const report = await getTransactionHistory(req.user.organizationId, startDate, endDate, limit);
    res.json({ success: true, report, transactions: report.transactions || [] });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ error: 'Failed to generate transaction history' });
  }
};

module.exports = {
  revenue,
  payments,
  outstandingInvoices,
  overdueInvoices,
  expenses,
  clientBalances,
  transactionHistory,
};
