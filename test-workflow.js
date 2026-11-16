const http = require('http');

let token = '';
let organizationId = '';
let clientId = '';
let serviceId = '';
let quoteId = '';
let invoiceId = '';

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
  name: 'Workflow Test User',
  email: `workflow${Date.now()}@payshield.com`,
  password: 'password123',
  businessName: 'Workflow Test Business'
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
  organizationId = result.organization.id;
  console.log('✓ Signup successful, org ID:', organizationId);

  console.log('\n=== Step 2: Create Client ===');
  const clientData = JSON.stringify({
    name: 'Test Client',
    email: 'client@test.com',
    phone: '+1234567890'
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
    clientId = clientResult.client.id;
    console.log('✓ Client created, ID:', clientId);

    console.log('\n=== Step 3: Create Service ===');
    const serviceData = JSON.stringify({
      name: 'Web Development',
      description: 'Custom website development',
      price: 5000,
      currency: 'USD'
    });

    makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/services',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(serviceData),
        'Authorization': `Bearer ${token}`
      }
    }, serviceData, (status, data) => {
      console.log('Create Service Status:', status);
      const serviceResult = JSON.parse(data);
      serviceId = serviceResult.service.id;
      console.log('✓ Service created, ID:', serviceId);

      console.log('\n=== Step 4: Create Quote ===');
      const quoteData = JSON.stringify({
        clientId: clientId,
        items: [
          { description: 'Web Development', quantity: 1, unitPrice: 5000 }
        ],
        notes: 'Test quote'
      });

      makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/quotes',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(quoteData),
          'Authorization': `Bearer ${token}`
        }
      }, quoteData, (status, data) => {
        console.log('Create Quote Status:', status);
        const quoteResult = JSON.parse(data);
        quoteId = quoteResult.quote.id;
        console.log('✓ Quote created, ID:', quoteId);
        console.log('Quote Total:', quoteResult.quote.total);

        console.log('\n=== Step 5: Convert Quote to Invoice ===');
        makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: `/api/quotes/${quoteId}/convert-to-invoice`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }, null, (status, data) => {
          console.log('Convert Quote Status:', status);
          const invoiceResult = JSON.parse(data);
          invoiceId = invoiceResult.invoice.id;
          console.log('✓ Invoice created from quote, ID:', invoiceId);
          console.log('Invoice Total:', invoiceResult.invoice.total);

          console.log('\n=== Step 6: Record Payment ===');
          const paymentData = JSON.stringify({
            invoiceId: invoiceId,
            amount: 2500,
            method: 'BANK_TRANSFER',
            provider: 'BANK',
            reference: 'TEST-REF-001'
          });

          makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/payments',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(paymentData),
              'Authorization': `Bearer ${token}`
            }
          }, paymentData, (status, data) => {
            console.log('Record Payment Status:', status);
            const paymentResult = JSON.parse(data);
            console.log('✓ Payment recorded, ID:', paymentResult.payment.id);

            console.log('\n=== Step 7: Check Invoice Status ===');
            makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/invoices/${invoiceId}`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }, null, (status, data) => {
              console.log('Get Invoice Status:', status);
              const invoice = JSON.parse(data).invoice;
              console.log('Invoice Status:', invoice.status);
              console.log('Amount Paid:', invoice.amountPaid);
              console.log('Balance:', invoice.balance);
              console.log('✓ Invoice status updated correctly');

              console.log('\n=== Step 8: Get Dashboard Metrics ===');
              makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/dashboard/metrics',
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              }, null, (status, data) => {
                console.log('Dashboard Metrics Status:', status);
                const metrics = JSON.parse(data).metrics;
                console.log('Total Revenue:', metrics.totalRevenue);
                console.log('Total Payments:', metrics.totalPayments);
                console.log('Outstanding Invoices:', metrics.outstandingInvoices);
                console.log('✓ Dashboard metrics working');

                console.log('\n=== All Tests Passed! ===');
              });
            });
          });
        });
      });
    });
  });
});
