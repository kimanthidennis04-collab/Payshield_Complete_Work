const express = require('express');
const router = express.Router();
const { generate, list } = require('../controllers/insightsController');
const { authenticate } = require('../middleware/auth');

router.post('/generate', authenticate, generate);
router.get('/', authenticate, list);

module.exports = router;
