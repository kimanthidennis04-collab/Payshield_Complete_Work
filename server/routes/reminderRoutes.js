const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  create,
  list,
  get,
  send,
  remove,
} = require('../controllers/reminderController');

router.post('/', authenticate, create);
router.get('/', authenticate, list);
router.get('/:id', authenticate, get);
router.post('/:id/send', authenticate, send);
router.delete('/:id', authenticate, remove);

module.exports = router;
