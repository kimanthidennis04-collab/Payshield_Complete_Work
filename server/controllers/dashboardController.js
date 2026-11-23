const {
  getDashboardMetrics,
  getCashFlowMetrics,
} = require('../services/dashboardService');

const getMetrics = async (req, res) => {
  try {
    const metrics = await getDashboardMetrics(req.user.organizationId);
    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
};

const getCashFlow = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const cashFlow = await getCashFlowMetrics(req.user.organizationId, startDate, endDate);
    res.json({ success: true, cashFlow });
  } catch (error) {
    console.error('Get cash flow error:', error);
    res.status(500).json({ error: 'Failed to fetch cash flow data' });
  }
};

module.exports = {
  getMetrics,
  getCashFlow,
};
