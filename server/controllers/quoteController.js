const {
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuote,
  deleteQuote,
  convertQuoteToInvoice,
} = require('../services/quoteService');

const create = async (req, res) => {
  try {
    const quote = await createQuote(req.user.organizationId, req.body);
    res.status(201).json({ success: true, quote });
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: error.message || 'Failed to create quote' });
  }
};

const list = async (req, res) => {
  try {
    const quotes = await getQuotes(req.user.organizationId, req.query);
    res.json({ success: true, quotes });
  } catch (error) {
    console.error('List quotes error:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
};

const getById = async (req, res) => {
  try {
    const quote = await getQuoteById(req.user.organizationId, req.params.id);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json({ success: true, quote });
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
};

const update = async (req, res) => {
  try {
    const quote = await updateQuote(req.user.organizationId, req.params.id, req.body);
    res.json({ success: true, quote });
  } catch (error) {
    console.error('Update quote error:', error);
    if (error.message === 'Quote not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update quote' });
  }
};

const remove = async (req, res) => {
  try {
    await deleteQuote(req.user.organizationId, req.params.id);
    res.json({ success: true, message: 'Quote deleted successfully' });
  } catch (error) {
    console.error('Delete quote error:', error);
    if (error.message === 'Quote not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete quote' });
  }
};

const convertToInvoice = async (req, res) => {
  try {
    const invoice = await convertQuoteToInvoice(req.user.organizationId, req.params.id);
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    console.error('Convert quote error:', error);
    if (error.message === 'Quote not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to convert quote' });
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  convertToInvoice,
};
