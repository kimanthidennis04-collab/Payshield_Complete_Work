const express = require('express');
const router = express.Router();
const { create, list, getById, update, remove } = require('../controllers/clientController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, create);
router.get('/', authenticate, list);
router.get('/:id', authenticate, getById);
router.put('/:id', authenticate, update);
router.delete('/:id', authenticate, remove);

module.exports = router;
