const { generateAIInsights, getAIInsights } = require('../services/aiService');

const generate = async (req, res) => {
  try {
    const insights = await generateAIInsights(req.user.organizationId);
    res.json({ success: true, insights });
  } catch (error) {
    console.error('Generate insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
};

const list = async (req, res) => {
  try {
    const insights = await getAIInsights(req.user.organizationId, req.query);
    res.json({ success: true, insights });
  } catch (error) {
    console.error('List insights error:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
};

module.exports = {
  generate,
  list,
};
