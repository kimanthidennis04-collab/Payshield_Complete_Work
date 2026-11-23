const crypto = require('crypto');
const mpesaService = require('./mpesaService');

class PaymentProviderAdapter {
  constructor(config) {
    this.config = config;
  }

  async initiatePayment(paymentData) {
    throw new Error('Method not implemented');
  }

  async verifyPayment(paymentReference) {
    throw new Error('Method not implemented');
  }

  async processWebhook(webhookData) {
    throw new Error('Method not implemented');
  }

  validateWebhookSignature(payload, signature) {
    throw new Error('Method not implemented');
  }

  generateIdempotencyKey(webhookData) {
    const dataString = JSON.stringify(webhookData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }
}

class MpesaAdapter extends PaymentProviderAdapter {
  constructor(config) {
    super(config);
    this.name = 'MPESA';
  }

  async initiatePayment(paymentData) {
    return await mpesaService.initiateStkPush(paymentData.organizationId, paymentData);
  }

  async verifyPayment(paymentReference) {
    const prisma = require('../config/database');
    const transaction = await prisma.transaction.findFirst({
      where: { reference: paymentReference, source: 'MOBILE_MONEY' },
      include: { invoice: true },
    });
    return transaction;
  }

  async processWebhook(webhookData) {
    if (webhookData.Body?.stkCallback) {
      return await mpesaService.processMpesaCallback(webhookData);
    }
    return { success: true, logged: true };
  }

  validateWebhookSignature(payload, signature) {
    // Daraja callbacks do not send HMAC signature; authenticity is validated via IP / SSL / CallbackMetadata structure
    if (!signature) return true;
    if (!this.config.passkey) return true;

    try {
      const payloadString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', this.config.passkey)
        .update(payloadString)
        .digest('base64');
      return expectedSignature === signature;
    } catch (error) {
      return false;
    }
  }
}

class BankAdapter extends PaymentProviderAdapter {
  constructor(config) {
    super(config);
    this.name = 'BANK';
  }

  async initiatePayment(paymentData) {
    console.log('Bank payment initiation not yet implemented');
    throw new Error('Bank integration requires credentials');
  }

  async verifyPayment(paymentReference) {
    console.log('Bank payment verification not yet implemented');
    throw new Error('Bank integration requires credentials');
  }

  async processWebhook(webhookData) {
    console.log('Bank webhook processing not yet implemented');
    throw new Error('Bank integration requires credentials');
  }

  validateWebhookSignature(payload, signature) {
    console.log('Bank signature validation not yet implemented');
    return false;
  }
}

class CardAdapter extends PaymentProviderAdapter {
  constructor(config) {
    super(config);
    this.name = 'CARD';
  }

  async initiatePayment(paymentData) {
    console.log('Card payment initiation not yet implemented');
    throw new Error('Card integration requires credentials');
  }

  async verifyPayment(paymentReference) {
    console.log('Card payment verification not yet implemented');
    throw new Error('Card integration requires credentials');
  }

  async processWebhook(webhookData) {
    console.log('Card webhook processing not yet implemented');
    throw new Error('Card integration requires credentials');
  }

  validateWebhookSignature(payload, signature) {
    console.log('Card signature validation not yet implemented');
    return false;
  }
}

class PaymentProviderFactory {
  static createAdapter(providerType, config) {
    switch (providerType.toUpperCase()) {
      case 'MPESA':
        return new MpesaAdapter(config);
      case 'BANK':
        return new BankAdapter(config);
      case 'CARD':
      case 'STRIPE':
        return new CardAdapter(config);
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}

module.exports = {
  PaymentProviderAdapter,
  MpesaAdapter,
  BankAdapter,
  CardAdapter,
  PaymentProviderFactory,
};
