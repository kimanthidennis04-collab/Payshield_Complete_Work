const http = require('http');

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

console.log('=== Test Webhook Endpoint ===');
const webhookData = JSON.stringify({
  provider: 'M-PESA',
  event: 'PAYMENT_SUCCESS',
  reference: 'WEBHOOK-TEST-001',
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
  console.log('Response:', data);
  if (status === 200 || status === 201) {
    console.log('✓ Webhook endpoint working');
  } else {
    console.log('✗ Webhook endpoint failed');
  }
});
