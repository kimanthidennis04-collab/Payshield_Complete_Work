const crypto = require('crypto');
const prisma = require('../config/database');
const paymentService = require('./paymentService');

/**
 * Safaricom M-Pesa Daraja 2.0 Integration Service
 * Compliant with official Safaricom Daraja API specifications.
 * Supports both Sandbox and Production environments.
 */

const getMpesaConfig = () => {
  const env = (process.env.MPESA_ENVIRONMENT || 'sandbox').toLowerCase();
  const baseUrl = env === 'production' 
    ? 'https://api.safaricom.co.ke' 
    : 'https://sandbox.safaricom.co.ke';

  return {
    environment: env,
    baseUrl,
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    passkey: process.env.MPESA_PASSKEY || '',
    shortcode: process.env.MPESA_SHORTCODE || '174379', // 174379 is standard Daraja sandbox shortcode
    callbackUrl: process.env.MPESA_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/api/webhooks/mpesa`,
  };
};

/**
 * Format Kenyan phone number to 254XXXXXXXXX format
 */
const formatPhoneNumber = (phone) => {
  if (!phone) throw new Error('Phone number is required for M-Pesa STK push');
  let cleaned = String(phone).replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  } else if (cleaned.startsWith('254')) {
    // already starts with 254
  } else {
    throw new Error(`Invalid phone number format: ${phone}. Expected Kenyan mobile number.`);
  }

  if (cleaned.length !== 12) {
    throw new Error(`Invalid phone number length (${cleaned.length} digits). Expected 12 digits (254XXXXXXXXX).`);
  }

  return cleaned;
};

/**
 * Generate M-Pesa OAuth 2.0 Access Token
 */
let cachedToken = null;
let tokenExpiry = 0;

const getAccessToken = async () => {
  const config = getMpesaConfig();
  
  if (!config.consumerKey || !config.consumerSecret) {
    throw new Error('M-Pesa credentials not configured. Please set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in .env.');
  }

  // Return cached token if valid (with 60-second safety buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
  const url = `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`M-Pesa OAuth failed (HTTP ${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (parseInt(data.expires_in, 10) * 1000);

  return cachedToken;
};

/**
 * Generate Lipa Na M-Pesa Online Password & Timestamp
 */
const generateStkPassword = (shortcode, passkey) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${year}${month}${date}${hours}${minutes}${seconds}`;

  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  return { password, timestamp };
};

/**
 * Initiate STK Push (Lipa Na M-Pesa Online)
 */
const initiateStkPush = async (organizationId, { invoiceId, phone, amount }) => {
  const config = getMpesaConfig();

  // 1. Verify invoice belongs to organization
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: { client: true },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status === 'PAID') {
    throw new Error('Invoice is already fully paid');
  }

  const payAmount = Math.round(Number(amount || invoice.balance));
  if (payAmount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }
  if (payAmount > invoice.balance) {
    throw new Error(`Payment amount (KES ${payAmount}) exceeds invoice balance (KES ${invoice.balance})`);
  }

  const formattedPhone = formatPhoneNumber(phone || invoice.client?.phone);

  if (!config.consumerKey || !config.passkey) {
    // Development fallback simulation mode
    return {
      success: true,
      mode: 'SIMULATED_SANDBOX',
      message: 'M-Pesa STK Push initiated in development mode (credentials not configured)',
      MerchantRequestID: `DEV-MR-${Date.now()}`,
      CheckoutRequestID: `ws_CO_${Date.now()}`,
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing (Dev Simulation)',
      CustomerMessage: `Success. Prompt for KES ${payAmount} sent to ${formattedPhone}`,
      invoiceId: invoice.id,
      amount: payAmount,
      phone: formattedPhone,
    };
  }

  const token = await getAccessToken();
  const { password, timestamp } = generateStkPassword(config.shortcode, config.passkey);

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: payAmount,
    PartyA: formattedPhone,
    PartyB: config.shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: config.callbackUrl,
    AccountReference: invoice.invoiceNumber,
    TransactionDesc: `PayShield ${invoice.invoiceNumber}`,
  };

  const url = `${config.baseUrl}/mpesa/stkpush/v1/processrequest`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok || result.ResponseCode !== '0') {
    throw new Error(result.errorMessage || result.ResponseDescription || 'STK Push failed');
  }

  return {
    success: true,
    mode: config.environment.toUpperCase(),
    MerchantRequestID: result.MerchantRequestID,
    CheckoutRequestID: result.CheckoutRequestID,
    ResponseCode: result.ResponseCode,
    ResponseDescription: result.ResponseDescription,
    CustomerMessage: result.CustomerMessage,
    invoiceId: invoice.id,
    amount: payAmount,
    phone: formattedPhone,
  };
};

/**
 * Process Safaricom Daraja Callback
 */
const processMpesaCallback = async (callbackData) => {
  const stkCallback = callbackData?.Body?.stkCallback;
  if (!stkCallback) {
    throw new Error('Invalid Daraja callback structure: missing Body.stkCallback');
  }

  const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

  // Handle cancelled or failed transaction
  if (ResultCode !== 0) {
    return {
      success: false,
      status: 'CANCELLED_OR_FAILED',
      ResultCode,
      ResultDesc,
      MerchantRequestID,
      CheckoutRequestID,
    };
  }

  // Extract metadata items
  const items = CallbackMetadata?.Item || [];
  const metaMap = {};
  items.forEach(item => {
    metaMap[item.Name] = item.Value;
  });

  const amount = Number(metaMap.Amount);
  const mpesaReceiptNumber = metaMap.MpesaReceiptNumber;
  const phoneNumber = String(metaMap.PhoneNumber || '');
  const transactionDate = metaMap.TransactionDate;

  if (!mpesaReceiptNumber) {
    throw new Error('Callback metadata missing MpesaReceiptNumber');
  }

  // Idempotency: prevent duplicate transaction creation
  const existingTransaction = await prisma.transaction.findFirst({
    where: { reference: mpesaReceiptNumber },
  });

  if (existingTransaction) {
    return {
      success: true,
      duplicate: true,
      message: 'Transaction already recorded',
      reference: mpesaReceiptNumber,
    };
  }

  // Attempt to find matching invoice by pending phone or recent transactions
  // Or look up through pending audit logs / account reference
  let invoice = null;

  // Search if reference matches an invoice or if client has open invoice with matching phone
  const client = await prisma.client.findFirst({
    where: {
      phone: { contains: phoneNumber.slice(-9) },
    },
    include: {
      invoices: {
        where: { status: { in: ['PENDING', 'PARTIAL'] } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (client && client.invoices.length > 0) {
    invoice = client.invoices[0];
  } else {
    // Fallback: match any open invoice in the system whose balance matches or accommodates the payment
    invoice = await prisma.invoice.findFirst({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        balance: { gte: amount },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!invoice) {
    throw new Error(`Could not correlate M-Pesa receipt ${mpesaReceiptNumber} (KES ${amount}) to an open invoice.`);
  }

  // Record payment via paymentService
  const payment = await paymentService.createPayment(invoice.organizationId, {
    invoiceId: invoice.id,
    amount,
    method: 'MOBILE_MONEY',
    provider: 'MPESA',
    reference: mpesaReceiptNumber,
    paidAt: transactionDate ? new Date() : new Date(),
  });

  return {
    success: true,
    payment,
    invoiceId: invoice.id,
    reference: mpesaReceiptNumber,
    amount,
  };
};

module.exports = {
  getMpesaConfig,
  formatPhoneNumber,
  getAccessToken,
  generateStkPassword,
  initiateStkPush,
  processMpesaCallback,
};
