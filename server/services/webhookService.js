const prisma = require('../config/database');
const { PaymentProviderFactory } = require('./paymentProviderService');

const logWebhook = async (data) => {
  const { organizationId, provider, event, reference, payload, status, error } = data;

  const createData = {
    provider,
    event,
    reference,
    payload: JSON.stringify(payload),
    status: status || 'RECEIVED',
  };

  if (organizationId) {
    createData.organizationId = organizationId;
  }

  if (error) {
    createData.error = error;
  }

  return await prisma.webhookLog.create({
    data: createData,
  });
};

const checkIdempotency = async (provider, event, reference) => {
  const existingWebhook = await prisma.webhookLog.findFirst({
    where: {
      provider,
      event,
      reference,
      status: 'PROCESSED',
    },
  });

  return existingWebhook !== null;
};

const processWebhook = async (provider, webhookData) => {
  try {
    const config = {
      consumerKey: process.env.MPESA_CONSUMER_KEY,
      consumerSecret: process.env.MPESA_CONSUMER_SECRET,
      passkey: process.env.MPESA_PASSKEY,
      shortcode: process.env.MPESA_SHORTCODE,
    };

    const adapter = PaymentProviderFactory.createAdapter(provider, config);

    const isDuplicate = await checkIdempotency(provider, webhookData.event, webhookData.reference);
    if (isDuplicate) {
      console.log('Duplicate webhook detected, skipping processing');
      await logWebhook({
        provider,
        event: webhookData.event,
        reference: webhookData.reference,
        payload: webhookData,
        status: 'DUPLICATE',
        error: 'Duplicate webhook event',
      });
      return { status: 'duplicate', message: 'Webhook already processed' };
    }

    const isValid = adapter.validateWebhookSignature(webhookData, webhookData.signature);

    if (!isValid) {
      await logWebhook({
        provider,
        event: webhookData.event,
        reference: webhookData.reference,
        payload: webhookData,
        status: 'FAILED',
        error: 'Invalid signature',
      });
      throw new Error('Invalid webhook signature');
    }

    const result = await adapter.processWebhook(webhookData);

    await logWebhook({
      organizationId: result.organizationId,
      provider,
      event: webhookData.event,
      reference: webhookData.reference,
      payload: webhookData,
      status: 'PROCESSED',
    });

    return result;
  } catch (error) {
    await logWebhook({
      provider,
      event: webhookData.event,
      reference: webhookData.reference,
      payload: webhookData,
      status: 'FAILED',
      error: error.message,
    });
    throw error;
  }
};

const getWebhookLogs = async (organizationId, filters = {}) => {
  const where = {};

  if (organizationId) {
    where.organizationId = organizationId;
  }

  if (filters.provider) {
    where.provider = filters.provider;
  }

  if (filters.event) {
    where.event = filters.event;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  return await prisma.webhookLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
};

module.exports = {
  logWebhook,
  processWebhook,
  getWebhookLogs,
};
