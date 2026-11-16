const http = require('http');

let token = '';

function makeRequest(options, data, callback) {
  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      callback(res.statusCode, responseData);
    });
  });

  req.on('error', (error) => {
    console.error('Request Error:', error);
  });

  if (data) {
    req.write(data);
  }
  req.end();
}

console.log('=== Step 1: Signup ===');
const signupData = JSON.stringify({
  name: 'Webhook Test User',
  email: `webhook${Date.now()}@payshield.com`,
  password: 'password123',
  businessName: 'Webhook Test Business'
});

makeRequest({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/signup',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(signupData) }
}, signupData, (status, data) => {
  console.log('Signup Status:', status);
  const result = JSON.parse(data);
  token = result.token;
  console.log('✓ Signup successful');

  console.log('\n=== Step 2: Send Webhook ===');
  const webhookData = JSON.stringify({
    provider: 'M-PESA',
    event: 'PAYMENT_SUCCESS',
    reference: 'WEBHOOK-TEST-002',
    organizationId: result.user.organizationId,
    payload: JSON.stringify({ transactionId: 'MP123456', amount: 1000, phone: '+254712345678' })
  });

  makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/webhooks',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(webhookData) }
  }, webhookData, (status, data) => {
    console.log('Webhook Status:', status);
    console.log('✓ Webhook sent');

    console.log('\n=== Step 3: Get Webhook Logs ===');
    makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/webhooks/logs',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, null, (status, data) => {
      console.log('Get Webhook Logs Status:', status);
      const logs = JSON.parse(data).logs;
      console.log('Number of webhook logs:', logs.length);
      if (logs.length > 0) {
        console.log('Most recent webhook:', logs[0].event, '-', logs[0].status);
        console.log('✓ Webhook logs persisting to database');
      } else {
        console.log('✗ No webhook logs found');
      }
    });
  });
});
