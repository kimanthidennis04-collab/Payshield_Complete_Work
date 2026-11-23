const express = require('express');
const router = express.Router();
const {
  receiveWebhook,
  getLogs,
  getAllLogs,
  processMpesaDarajaCallback,
  verifyWhatsAppWebhook,
  processWhatsAppWebhookEvent,
} = require('../controllers/webhookController');
const { authenticate } = require('../middleware/auth');

router.post('/', receiveWebhook);
router.post('/mpesa', processMpesaDarajaCallback);
router.get('/whatsapp', verifyWhatsAppWebhook);
router.post('/whatsapp', processWhatsAppWebhookEvent);
router.get('/logs', authenticate, getLogs);
router.get('/logs/all', getAllLogs);

module.exports = router;
