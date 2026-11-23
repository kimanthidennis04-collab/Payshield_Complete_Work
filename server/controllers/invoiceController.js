const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
} = require('../services/invoiceService');
const { exportInvoicesToCSV } = require('../utils/csvExport');

const create = async (req, res) => {
  try {
    const invoice = await createInvoice(req.user.organizationId, req.body);
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to create invoice' });
  }
};

const list = async (req, res) => {
  try {
    const invoices = await getInvoices(req.user.organizationId, req.query);
    res.json({ success: true, invoices });
  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const invoices = await getInvoices(req.user.organizationId, req.query);
    const csv = exportInvoicesToCSV(invoices);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export invoices error:', error);
    res.status(500).json({ error: 'Failed to export invoices' });
  }
};

const getById = async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.user.organizationId, req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

const update = async (req, res) => {
  try {
    const invoice = await updateInvoice(req.user.organizationId, req.params.id, req.body);
    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Update invoice error:', error);
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update invoice' });
  }
};

const remove = async (req, res) => {
  try {
    await deleteInvoice(req.user.organizationId, req.params.id);
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete invoice' });
  }
};

module.exports = {
  create,
  list,
  exportCSV,
  getById,
  update,
  remove,
};
