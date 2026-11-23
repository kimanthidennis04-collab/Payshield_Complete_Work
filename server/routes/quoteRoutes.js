const express = require('express');
const router = express.Router();
const { create, list, getById, update, remove, convertToInvoice } = require('../controllers/quoteController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, create);
router.get('/', authenticate, list);
router.get('/:id', authenticate, getById);
router.put('/:id', authenticate, update);
router.delete('/:id', authenticate, remove);
router.post('/:id/convert-to-invoice', authenticate, convertToInvoice);
router.post('/:id/convert', authenticate, convertToInvoice);

module.exports = router;
