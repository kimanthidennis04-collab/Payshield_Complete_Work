const prisma = require('../config/database');

/**
 * Meta WhatsApp Business Cloud API Service
 * Official Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const getWhatsAppConfig = (organization = null) => {
  // Support multi-business per-org token or fallback to platform environment variables
  return {
    accessToken: organization?.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: organization?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: organization?.whatsappBusinessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v19.0',
  };
};

/**
 * Normalize phone number to international E.164 without '+' or leading zeros
 */
const formatWhatsAppPhone = (phone) => {
  if (!phone) throw new Error('Phone number is required for WhatsApp delivery');
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1); // Default Kenya
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
};

/**
 * Send WhatsApp text message via Meta Cloud API
 */
const sendTextMessage = async (organizationId, { to, message, invoiceId = null }) => {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const config = getWhatsAppConfig(org);

  const formattedPhone = formatWhatsAppPhone(to);

  if (!config.accessToken || !config.phoneNumberId) {
    return {
      success: false,
      mode: 'MISSING_CREDENTIALS',
      message: 'Meta WhatsApp Business Cloud API is not configured. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env or configure in Organization Settings.',
      recipient: formattedPhone,
    };
  }

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'text',
    text: { preview_url: true, body: message },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to send WhatsApp message via Meta Cloud API');
  }

  return {
    success: true,
    messageId: data.messages?.[0]?.id,
    recipient: formattedPhone,
    status: 'SENT',
  };
};

/**
 * Generate click-to-chat WhatsApp direct web link (free, immediate, no credentials required)
 */
const generateWhatsAppShareLink = (phone, text) => {
  const formattedPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
};

/**
 * Send Invoice Notification via WhatsApp
 */
const sendInvoiceNotification = async (organizationId, invoiceId) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: { client: true, organization: true },
  });

  if (!invoice) throw new Error('Invoice not found');
  if (!invoice.client?.phone) throw new Error('Client has no phone number registered for WhatsApp delivery');

  const cur = invoice.currency || invoice.organization?.currency || 'KES';
  const orgName = invoice.organization?.name || 'PayShield';
  const message = `Hello ${invoice.client.name},\n\nYour invoice *${invoice.invoiceNumber}* from *${orgName}* is ready.\n\n*Amount Due:* ${cur} ${invoice.total.toLocaleString()}\n*Balance:* ${cur} ${invoice.balance.toLocaleString()}\n*Due Date:* ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt'}\n\nThank you for your business!`;

  return await sendTextMessage(organizationId, {
    to: invoice.client.phone,
    message,
    invoiceId: invoice.id,
  });
};

/**
 * Send Payment Confirmation via WhatsApp
 */
const sendPaymentConfirmation = async (organizationId, paymentId) => {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, organizationId },
    include: { invoice: { include: { client: true, organization: true } } },
  });

  if (!payment) throw new Error('Payment not found');
  const invoice = payment.invoice;
  if (!invoice?.client?.phone) throw new Error('Client has no phone number registered');

  const cur = payment.currency || invoice.currency || 'KES';
  const message = `Payment Received! 🎉\n\nDear ${invoice.client.name},\nWe have successfully received your payment of *${cur} ${payment.amount.toLocaleString()}* for invoice *${invoice.invoiceNumber}*.\n\n*Reference:* ${payment.reference || 'N/A'}\n*Remaining Balance:* ${cur} ${invoice.balance.toLocaleString()}\n*Invoice Status:* ${invoice.status}\n\nThank you for prompt settlement!`;

  return await sendTextMessage(organizationId, {
    to: invoice.client.phone,
    message,
    invoiceId: invoice.id,
  });
};

/**
 * Process Meta WhatsApp Inbound Webhook (Delivery status & incoming messages)
 */
const processWhatsAppWebhook = async (webhookBody) => {
  // Meta WhatsApp Cloud API Webhook payload structure
  const entry = webhookBody.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value) {
    return { status: 'IGNORED', reason: 'Not a WhatsApp change event' };
  }

  // Handle message status updates (sent, delivered, read, failed)
  if (value.statuses && value.statuses.length > 0) {
    const statusUpdate = value.statuses[0];
    const messageId = statusUpdate.id;
    const deliveryStatus = statusUpdate.status; // 'sent' | 'delivered' | 'read' | 'failed'
    const recipientId = statusUpdate.recipient_id;

    // Log status transition in WebhookLog
    await prisma.webhookLog.create({
      data: {
        provider: 'WHATSAPP',
        event: `STATUS_${deliveryStatus.toUpperCase()}`,
        reference: messageId,
        payload: JSON.stringify(statusUpdate),
        status: deliveryStatus === 'failed' ? 'FAILED' : 'PROCESSED',
        error: statusUpdate.errors ? JSON.stringify(statusUpdate.errors) : null,
      },
    });

    return {
      status: 'PROCESSED',
      type: 'STATUS_UPDATE',
      messageId,
      deliveryStatus,
      recipientId,
    };
  }

  return { status: 'RECEIVED', type: 'OTHER' };
};

module.exports = {
  getWhatsAppConfig,
  formatWhatsAppPhone,
  sendTextMessage,
  sendInvoiceNotification,
  sendPaymentConfirmation,
  processWhatsAppWebhook,
  generateWhatsAppShareLink,
};
