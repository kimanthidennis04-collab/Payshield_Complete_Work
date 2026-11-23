require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const prisma = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const insightsRoutes = require('./routes/insightsRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const deliverableRoutes = require('./routes/deliverableRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const realEstateRoutes = require('./routes/realEstateRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Apply rate limiting to API routes, configurable via environment
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
});

app.use('/api', apiLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static assets reliably using absolute directory resolution
app.use(express.static(path.join(__dirname, '../public')));

// HTML Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/signup.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/dashboard.html'));
});

app.get('/clients', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/clients.html'));
});

app.get('/services', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/services.html'));
});

app.get('/quotes', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/quotes.html'));
});

app.get('/invoices', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/invoices.html'));
});

app.get('/payments', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/payments.html'));
});

app.get('/transactions', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/transactions.html'));
});

app.get('/expenses', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/expenses.html'));
});

app.get('/cashflow', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/cashflow.html'));
});

app.get('/reports', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/reports.html'));
});

app.get('/insights', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/insights.html'));
});

app.get('/deliverables', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/deliverables.html'));
});

app.get('/reminders', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/reminders.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/settings.html'));
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/deliverables', deliverableRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/realestate', realEstateRoutes);

// Health check endpoint validating both backend and database connectivity
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      status: 'degraded',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

if (require.main === module) {
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`PayShield server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
