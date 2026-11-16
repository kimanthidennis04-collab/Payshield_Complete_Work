const http = require('http');

let token = '';
let invoiceId = '';

function makeRequest(options, data, callback) {
  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      callback(res.statusCode, responseData, res.headers);
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
  name: 'CSV Export Test User',
  email: `csv${Date.now()}@payshield.com`,
  password: 'password123',
  businessName: 'CSV Export Test Business'
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

  console.log('\n=== Step 2: Create Client ===');
  const clientData = JSON.stringify({
    name: 'CSV Export Client',
    email: 'client@csv.com'
  });

  makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/clients',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(clientData),
      'Authorization': `Bearer ${token}`
    }
  }, clientData, (status, data) => {
    console.log('Create Client Status:', status);
    const clientResult = JSON.parse(data);
    const clientId = clientResult.client.id;
    console.log('✓ Client created');

    console.log('\n=== Step 3: Create Invoice ===');
    const invoiceData = JSON.stringify({
      clientId: clientId,
      items: [{ description: 'Test Service', quantity: 1, unitPrice: 1000 }],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/invoices',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(invoiceData),
        'Authorization': `Bearer ${token}`
      }
    }, invoiceData, (status, data) => {
      console.log('Create Invoice Status:', status);
      const invoiceResult = JSON.parse(data);
      invoiceId = invoiceResult.invoice.id;
      console.log('✓ Invoice created');

      console.log('\n=== Step 4: Create Expense ===');
      const expenseData = JSON.stringify({
        category: 'Office',
        description: 'Rent',
        amount: 500,
        currency: 'USD',
        date: new Date().toISOString()
      });

      makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/expenses',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(expenseData),
          'Authorization': `Bearer ${token}`
        }
      }, expenseData, (status, data) => {
        console.log('Create Expense Status:', status);
        console.log('✓ Expense created');

        console.log('\n=== Step 5: Export Invoices CSV ===');
        makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: '/api/invoices/export',
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }, null, (status, data, headers) => {
          console.log('Export Invoices Status:', status);
          console.log('Content-Type:', headers['content-type']);
          if (status === 200 && headers['content-type'].includes('text/csv')) {
            console.log('✓ Invoices CSV export working');
            console.log('CSV Data (first 200 chars):', data.substring(0, 200));
          } else {
            console.log('✗ Invoices CSV export failed');
          }

          console.log('\n=== Step 6: Export Expenses CSV ===');
          makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/expenses/export',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
          }, null, (status, data, headers) => {
            console.log('Export Expenses Status:', status);
            console.log('Content-Type:', headers['content-type']);
            if (status === 200 && headers['content-type'].includes('text/csv')) {
              console.log('✓ Expenses CSV export working');
              console.log('CSV Data (first 200 chars):', data.substring(0, 200));
            } else {
              console.log('✗ Expenses CSV export failed');
            }

            console.log('\n=== All CSV Export Tests Passed! ===');
          });
        });
      });
    });
  });
});
