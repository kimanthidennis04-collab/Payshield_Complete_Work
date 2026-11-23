const {
  createPayment,
  getPayments,
  getPaymentById,
} = require('../services/paymentService');
const { exportPaymentsToCSV } = require('../utils/csvExport');
const mpesaService = require('../services/mpesaService');

const initiateMpesaStk = async (req, res) => {
  try {
    const result = await mpesaService.initiateStkPush(req.user.organizationId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('M-Pesa STK push error:', error);
    res.status(400).json({ error: error.message || 'Failed to initiate M-Pesa payment' });
  }
};

const create = async (req, res) => {
  try {
    const payment = await createPayment(req.user.organizationId, req.body);
    res.status(201).json({ success: true, payment });
  } catch (error) {
    console.error('Create payment error:', error);
    if (error.message === 'Invoice not found' || error.message === 'Payment amount must be greater than zero' || error.message === 'Payment amount exceeds outstanding balance') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to create payment' });
  }
};

const list = async (req, res) => {
  try {
    const payments = await getPayments(req.user.organizationId, req.query);
    res.json({ success: true, payments });
  } catch (error) {
    console.error('List payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const payments = await getPayments(req.user.organizationId, req.query);
    const csv = exportPaymentsToCSV(payments);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export payments error:', error);
    res.status(500).json({ error: 'Failed to export payments' });
  }
};

const getById = async (req, res) => {
  try {
    const payment = await getPaymentById(req.user.organizationId, req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json({ success: true, payment });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

module.exports = {
  create,
  list,
  exportCSV,
  getById,
  initiateMpesaStk,
};
