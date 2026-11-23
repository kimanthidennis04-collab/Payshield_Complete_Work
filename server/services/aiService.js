const prisma = require('../config/database');

class AIProviderAdapter {
  constructor(config) {
    this.config = config;
  }

  async analyzeBusinessData(data) {
    throw new Error('Method not implemented');
  }

  async generateInsight(insightData) {
    throw new Error('Method not implemented');
  }
}

class MockAIAdapter extends AIProviderAdapter {
  constructor(config) {
    super(config);
    this.name = 'MOCK';
  }

  async analyzeBusinessData(data) {
    const insights = [];

    const { invoices, payments, expenses } = data;

    let totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    let totalOutstanding = 0;
    let overdueCount = 0;
    let upcomingDueIn7Days = 0;
    let upcomingDueIn30Days = 0;
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    invoices.forEach(inv => {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = inv.total - paid;

      if (inv.status !== 'PAID' && inv.status !== 'CANCELLED') {
        totalOutstanding += balance;

        if (inv.dueDate && new Date(inv.dueDate) < now) {
          overdueCount++;
        }

        if (inv.dueDate && new Date(inv.dueDate) >= now && new Date(inv.dueDate) <= sevenDays) {
          upcomingDueIn7Days += balance;
        }

        if (inv.dueDate && new Date(inv.dueDate) >= now && new Date(inv.dueDate) <= thirtyDays) {
          upcomingDueIn30Days += balance;
        }
      }
    });

    if (totalOutstanding > totalRevenue) {
      insights.push({
        type: 'CASH_FLOW',
        title: 'High Outstanding Receivables',
        content: `Outstanding receivables ($${totalOutstanding.toFixed(2)}) exceed total cash collected ($${totalRevenue.toFixed(2)}). This may impact cash flow.`,
        severity: 'WARNING',
      });
    }

    if (overdueCount > 0) {
      insights.push({
        type: 'PAYMENTS',
        title: 'Overdue Invoices Detected',
        content: `You have ${overdueCount} overdue invoices. Consider sending payment reminders.`,
        severity: 'WARNING',
      });
    }

    if (upcomingDueIn7Days > 0) {
      insights.push({
        type: 'CASH_FLOW_FORECAST',
        title: 'Upcoming Payments - Next 7 Days',
        content: `$${upcomingDueIn7Days.toFixed(2)} in invoices due within the next 7 days. Ensure sufficient cash flow.`,
        severity: 'INFO',
      });
    }

    if (upcomingDueIn30Days > 0) {
      insights.push({
        type: 'CASH_FLOW_FORECAST',
        title: 'Upcoming Payments - Next 30 Days',
        content: `$${upcomingDueIn30Days.toFixed(2)} in invoices due within the next 30 days. Plan cash flow accordingly.`,
        severity: 'INFO',
      });
    }

    const monthlyExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const averageMonthlyRevenue = totalRevenue;
    const netCashFlow = totalRevenue - monthlyExpenses;

    if (netCashFlow < 0) {
      insights.push({
        type: 'CASH_FLOW',
        title: 'Negative Cash Flow Warning',
        content: `Monthly expenses ($${monthlyExpenses.toFixed(2)}) exceed revenue ($${totalRevenue.toFixed(2)}). Net cash flow: -$${Math.abs(netCashFlow).toFixed(2)}. Review spending.`,
        severity: 'CRITICAL',
      });
    } else if (netCashFlow < averageMonthlyRevenue * 0.2) {
      insights.push({
        type: 'CASH_FLOW',
        title: 'Low Cash Flow Margin',
        content: `Net cash flow ($${netCashFlow.toFixed(2)}) is less than 20% of revenue. Maintain reserves for unexpected expenses.`,
        severity: 'WARNING',
      });
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    if (totalExpenses > totalRevenue * 0.8) {
      insights.push({
        type: 'EXPENSES',
        title: 'High Expense Ratio',
        content: `Expenses ($${totalExpenses.toFixed(2)}) represent ${((totalExpenses / totalRevenue) * 100).toFixed(1)}% of revenue. Review spending patterns.`,
        severity: 'INFO',
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: 'GENERAL',
        title: 'Business Health Good',
        content: 'Your business metrics are within healthy ranges. Continue monitoring.',
        severity: 'INFO',
      });
    }

    return insights;
  }

  async generateInsight(insightData) {
    return insightData;
  }
}

class RealAIAdapter extends AIProviderAdapter {
  constructor(config) {
    super(config);
    this.name = 'REAL';
  }

  async analyzeBusinessData(data) {
    if (!this.config.apiKey) {
      throw new Error('AI provider API key not configured');
    }

    console.log('Real AI analysis not yet implemented - requires provider integration');
    const mockAdapter = new MockAIAdapter({});
    return await mockAdapter.analyzeBusinessData(data);
  }

  async generateInsight(insightData) {
    if (!this.config.apiKey) {
      throw new Error('AI provider API key not configured');
    }

    console.log('Real AI insight generation not yet implemented - requires provider integration');
    return insightData;
  }
}

const AIProviderFactory = {
  createAdapter: (config) => {
    if (config.apiKey && config.apiKey.length > 0) {
      return new RealAIAdapter(config);
    }
    return new MockAIAdapter(config);
  },
};

const generateAIInsights = async (organizationId) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId },
      include: { payments: true, client: true },
    });

    const payments = await prisma.payment.findMany({
      where: { organizationId, status: 'COMPLETED' },
    });

    const expenses = await prisma.expense.findMany({
      where: { organizationId },
    });

    const config = {
      apiKey: process.env.AI_PROVIDER_KEY,
      endpoint: process.env.AI_PROVIDER_ENDPOINT,
    };

    const adapter = AIProviderFactory.createAdapter(config);
    const insights = await adapter.analyzeBusinessData({ invoices, payments, expenses });

    for (const insight of insights) {
      await prisma.aIInsight.create({
        data: {
          organizationId,
          type: insight.type,
          title: insight.title,
          content: insight.content,
          severity: insight.severity,
        },
      });
    }

    return insights;
  } catch (error) {
    console.error('AI insights generation error:', error);
    throw error;
  }
};

const getAIInsights = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.severity) {
    where.severity = filters.severity;
  }

  return await prisma.aIInsight.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

module.exports = {
  AIProviderAdapter,
  MockAIAdapter,
  RealAIAdapter,
  AIProviderFactory,
  generateAIInsights,
  getAIInsights,
};
