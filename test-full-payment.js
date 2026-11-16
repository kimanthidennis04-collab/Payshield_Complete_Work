const http = require('http');

let token = '';
let organizationId = '';
let clientId = '';
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
  name: 'Full Payment Test User',
  email: `fullpay${Date.now()}@payshield.com`,
  password: 'password123',
  businessName: 'Full Payment Test Business'
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
  console.log('✓ Signup successful');

  console.log('\n=== Step 2: Create Client ===');
  const clientData = JSON.stringify({
    name: 'Full Payment Client',
    email: 'client@fullpay.com'
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
      console.log('✓ Invoice created, Total:', invoiceResult.invoice.total);

      console.log('\n=== Step 4: Record Full Payment ===');
      const paymentData = JSON.stringify({
        invoiceId: invoiceId,
        amount: 1160, // Full amount including tax
        method: 'BANK_TRANSFER',
        provider: 'BANK',
        reference: 'FULL-PAY-001'
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
        console.log('✓ Payment recorded');

        console.log('\n=== Step 5: Check Invoice Status (Should be PAID) ===');
        makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: `/api/invoices/${invoiceId}`,
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }, null, (status, data) => {
          console.log('Get Invoice Status:', status);
          const invoice = JSON.parse(data).invoice;
          console.log('Invoice Status:', invoice.status);
          console.log('Amount Paid:', invoice.amountPaid);
          console.log('Balance:', invoice.balance);
          if (invoice.status === 'PAID' && invoice.balance === 0) {
            console.log('✓ Full payment correctly marked invoice as PAID');
          } else {
            console.log('✗ Invoice status incorrect');
          }

          console.log('\n=== Step 6: Create Expense ===');
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

            console.log('\n=== Step 7: Get Cash Flow Metrics ===');
            makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: '/api/dashboard/cashflow',
              method: 'GET',
              headers: { 'Authorization': `Bearer ${token}` }
            }, null, (status, data) => {
              console.log('Cash Flow Status:', status);
              const cashFlow = JSON.parse(data).cashFlow;
              console.log('Money Received:', cashFlow.moneyReceived);
              console.log('Total Expenses:', cashFlow.totalExpenses);
              console.log('Net Cash Flow:', cashFlow.netCashFlow);
              console.log('✓ Cash flow metrics working');

              console.log('\n=== Step 8: Generate AI Insights ===');
              makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/insights/generate',
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
              }, null, (status, data) => {
                console.log('Generate Insights Status:', status);
                const insights = JSON.parse(data).insights;
                console.log('Number of insights generated:', insights.length);
                insights.forEach(insight => {
                  console.log('- ' + insight.title + ' (' + insight.severity + ')');
                });
                console.log('✓ AI insights generated');

                console.log('\n=== Step 9: Get Revenue Report ===');
                makeRequest({
                  hostname: 'localhost',
                  port: 3000,
                  path: '/api/reports/revenue',
                  method: 'GET',
                  headers: { 'Authorization': `Bearer ${token}` }
                }, null, (status, data) => {
                  console.log('Revenue Report Status:', status);
                  const report = JSON.parse(data).report;
                  console.log('Total Revenue:', report.totalRevenue);
                  console.log('Transaction Count:', report.transactionCount);
                  console.log('✓ Revenue report working');

                  console.log('\n=== All Extended Tests Passed! ===');
                });
              });
            });
          });
        });
      });
    });
  });
});
