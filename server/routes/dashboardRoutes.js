const express = require('express');
const router = express.Router();
const { getMetrics, getCashFlow } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/metrics', authenticate, getMetrics);
router.get('/cashflow', authenticate, getCashFlow);

module.exports = router;
