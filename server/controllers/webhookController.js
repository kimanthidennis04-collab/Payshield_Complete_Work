const prisma = require('../config/database');
const { logWebhook, processWebhook, getWebhookLogs } = require('../services/webhookService');

const receiveWebhook = async (req, res) => {
  try {
    let { provider, event, reference, payload, organizationId } = req.body;

    if (!provider || !event) {
      return res.status(400).json({ error: 'Provider and event are required' });
    }

    if (!organizationId && req.query.organizationId) {
      organizationId = req.query.organizationId;
    }

    if (!organizationId && reference) {
      try {
        const invoice = await prisma.invoice.findFirst({
          where: { OR: [{ id: reference }, { invoiceNumber: reference }] },
          select: { organizationId: true }
        });
        if (invoice) {
          organizationId = invoice.organizationId;
        }
      } catch (err) {
        // ignore lookup error
      }
    }

    await logWebhook({
      organizationId,
      provider,
      event,
      reference,
      payload,
      status: 'RECEIVED',
    });

    try {
      const result = await processWebhook(provider, { event, reference, payload, organizationId });
      res.status(200).json({ success: true, data: result });
    } catch (processingError) {
      await logWebhook({
        organizationId,
        provider,
        event,
        reference,
        payload,
        status: 'FAILED',
        error: processingError.message,
      });
      res.status(200).json({ success: true, message: 'Webhook logged but processing failed (may need provider config)', error: processingError.message });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getLogs = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const filters = req.query;

    const logs = await getWebhookLogs(organizationId, filters);

    res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('Get webhook logs error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getAllLogs = async (req, res) => {
  try {
    const filters = req.query;

    const logs = await getWebhookLogs(null, filters);

    res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('Get all webhook logs error:', error);
    res.status(500).json({ error: error.message });
  }
};

const mpesaService = require('../services/mpesaService');
const whatsappService = require('../services/whatsappService');

const verifyWhatsAppWebhook = (req, res) => {
  // Meta webhook verification challenge
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'payshield_meta_verify_token';

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

const processWhatsAppWebhookEvent = async (req, res) => {
  try {
    const result = await whatsappService.processWhatsAppWebhook(req.body);
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(200).json({ success: false, error: error.message });
  }
};

const processMpesaDarajaCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    await logWebhook({
      organizationId: null,
      provider: 'MPESA',
      event: 'STK_CALLBACK',
      reference: callbackData?.Body?.stkCallback?.CheckoutRequestID || null,
      payload: callbackData,
      status: 'RECEIVED',
    });

    const result = await mpesaService.processMpesaCallback(callbackData);
    // Safaricom expects standard response acknowledgment
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted', data: result });
  } catch (error) {
    console.error('M-Pesa callback handling error:', error);
    // Still return 200 to Safaricom with ResultCode 0 or log failure so it doesn't storm retries
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted with internal note', error: error.message });
  }
};

module.exports = {
  receiveWebhook,
  getLogs,
  getAllLogs,
  processMpesaDarajaCallback,
  verifyWhatsAppWebhook,
  processWhatsAppWebhookEvent,
};
