const express = require('express');
const router = express.Router();
const { create, list, exportCSV, getById, initiateMpesaStk } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, create);
router.get('/', authenticate, list);
router.get('/export', authenticate, exportCSV);
router.post('/mpesa/stk', authenticate, initiateMpesaStk);
router.get('/:id', authenticate, getById);

module.exports = router;
