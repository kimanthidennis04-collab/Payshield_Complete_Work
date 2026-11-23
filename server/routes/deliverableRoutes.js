const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  create,
  list,
  get,
  checkAccessControl,
  unlock,
  remove,
} = require('../controllers/deliverableController');

router.post('/', authenticate, create);
router.get('/', authenticate, list);
router.get('/:id', authenticate, get);
router.get('/:id/access', authenticate, checkAccessControl);
router.post('/:id/unlock', authenticate, unlock);
router.delete('/:id', authenticate, remove);

module.exports = router;
