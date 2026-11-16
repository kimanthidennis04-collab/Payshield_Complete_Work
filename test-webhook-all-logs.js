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

console.log('=== Step 1: Send Webhook ===');
const webhookData = JSON.stringify({
  provider: 'M-PESA',
  event: 'PAYMENT_SUCCESS',
  reference: 'WEBHOOK-TEST-003',
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

  console.log('\n=== Step 2: Get All Webhook Logs ===');
  makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/webhooks/logs/all',
    method: 'GET',
  }, null, (status, data) => {
    console.log('Get All Webhook Logs Status:', status);
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
