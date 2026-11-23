const express = require('express');
const router = express.Router();
const {
  revenue,
  payments,
  outstandingInvoices,
  overdueInvoices,
  expenses,
  clientBalances,
  transactionHistory,
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.get('/revenue', authenticate, revenue);
router.get('/payments', authenticate, payments);
router.get('/outstanding-invoices', authenticate, outstandingInvoices);
router.get('/outstanding', authenticate, outstandingInvoices);
router.get('/overdue-invoices', authenticate, overdueInvoices);
router.get('/overdue', authenticate, overdueInvoices);
router.get('/expenses', authenticate, expenses);
router.get('/client-balances', authenticate, clientBalances);
router.get('/balances', authenticate, clientBalances);
router.get('/transaction-history', authenticate, transactionHistory);
router.get('/transactions', authenticate, transactionHistory);

module.exports = router;
