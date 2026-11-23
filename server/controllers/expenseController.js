const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} = require('../services/expenseService');
const { exportExpensesToCSV } = require('../utils/csvExport');

const create = async (req, res) => {
  try {
    const expense = await createExpense(req.user.organizationId, req.body);
    res.status(201).json({ success: true, expense });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: error.message || 'Failed to create expense' });
  }
};

const list = async (req, res) => {
  try {
    const expenses = await getExpenses(req.user.organizationId, req.query);
    res.json({ success: true, expenses });
  } catch (error) {
    console.error('List expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const expenses = await getExpenses(req.user.organizationId, req.query);
    const csv = exportExpensesToCSV(expenses);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export expenses error:', error);
    res.status(500).json({ error: 'Failed to export expenses' });
  }
};

const getById = async (req, res) => {
  try {
    const expense = await getExpenseById(req.user.organizationId, req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ success: true, expense });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
};

const update = async (req, res) => {
  try {
    const expense = await updateExpense(req.user.organizationId, req.params.id, req.body);
    res.json({ success: true, expense });
  } catch (error) {
    console.error('Update expense error:', error);
    if (error.message === 'Expense not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update expense' });
  }
};

const remove = async (req, res) => {
  try {
    await deleteExpense(req.user.organizationId, req.params.id);
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    if (error.message === 'Expense not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete expense' });
  }
};

module.exports = {
  create,
  list,
  getById,
  exportCSV,
  update,
  remove,
};
