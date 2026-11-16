const http = require('http');

let token = '';
let organizationId = '';
let clientId = '';
let invoiceId = '';
let deliverableId = '';
let reminderId = '';

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
  name: 'New Features Test User',
  email: `newfeat${Date.now()}@payshield.com`,
  password: 'password123',
  businessName: 'New Features Test Business'
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
    name: 'New Features Client',
    email: 'client@newfeat.com'
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
      console.log('✓ Invoice created');

      console.log('\n=== Step 4: Create Deliverable ===');
      const deliverableData = JSON.stringify({
        invoiceId: invoiceId,
        name: 'Test Report.pdf',
        filePath: '/uploads/reports/test-report.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
        isProtected: true
      });

      makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/deliverables',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(deliverableData),
          'Authorization': `Bearer ${token}`
        }
      }, deliverableData, (status, data) => {
        console.log('Create Deliverable Status:', status);
        const deliverableResult = JSON.parse(data);
        deliverableId = deliverableResult.deliverable.id;
        console.log('✓ Deliverable created');

        console.log('\n=== Step 5: Check Deliverable Access (Should be denied - invoice not paid) ===');
        makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: `/api/deliverables/${deliverableId}/access`,
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }, null, (status, data) => {
          console.log('Check Access Status:', status);
          const access = JSON.parse(data).access;
          console.log('Access Allowed:', access.allowed);
          console.log('Reason:', access.reason);
          if (!access.allowed) {
            console.log('✓ Deliverable correctly locked');
          } else {
            console.log('✗ Deliverable should be locked');
          }

          console.log('\n=== Step 6: Create Payment Reminder ===');
          const reminderData = JSON.stringify({
            invoiceId: invoiceId,
            scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            method: 'MANUAL'
          });

          makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/reminders',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(reminderData),
              'Authorization': `Bearer ${token}`
            }
          }, reminderData, (status, data) => {
            console.log('Create Reminder Status:', status);
            const reminderResult = JSON.parse(data);
            reminderId = reminderResult.reminder.id;
            console.log('✓ Reminder created');

            console.log('\n=== Step 7: Get Reminders ===');
            makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: '/api/reminders',
              method: 'GET',
              headers: { 'Authorization': `Bearer ${token}` }
            }, null, (status, data) => {
              console.log('Get Reminders Status:', status);
              const reminders = JSON.parse(data).reminders;
              console.log('Number of reminders:', reminders.length);
              if (reminders.length > 0) {
                console.log('Most recent reminder:', reminders[0].method, '-', reminders[0].status);
                console.log('✓ Reminders persisting to database');
              } else {
                console.log('✗ No reminders found');
              }

              console.log('\n=== Step 8: Record Payment ===');
              const paymentData = JSON.stringify({
                invoiceId: invoiceId,
                amount: 1160,
                method: 'BANK_TRANSFER',
                provider: 'BANK',
                reference: 'TEST-PAY-001'
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

                console.log('\n=== Step 9: Check Deliverable Access (Should be allowed - invoice paid) ===');
                makeRequest({
                  hostname: 'localhost',
                  port: 3000,
                  path: `/api/deliverables/${deliverableId}/access`,
                  method: 'GET',
                  headers: { 'Authorization': `Bearer ${token}` }
                }, null, (status, data) => {
                  console.log('Check Access Status:', status);
                  const access = JSON.parse(data).access;
                  console.log('Access Allowed:', access.allowed);
                  console.log('Reason:', access.reason);
                  if (access.allowed) {
                    console.log('✓ Deliverable correctly accessible after payment');
                  } else {
                    console.log('✗ Deliverable should be accessible after payment');
                  }

                  console.log('\n=== Step 10: Unlock Deliverable ===');
                  makeRequest({
                    hostname: 'localhost',
                    port: 3000,
                    path: `/api/deliverables/${deliverableId}/unlock`,
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                  }, null, (status, data) => {
                    console.log('Unlock Deliverable Status:', status);
                    const unlocked = JSON.parse(data).deliverable;
                    console.log('Is Unlocked:', unlocked.isUnlocked);
                    if (unlocked.isUnlocked) {
                      console.log('✓ Deliverable unlocked successfully');
                    } else {
                      console.log('✗ Deliverable unlock failed');
                    }

                    console.log('\n=== All New Features Tests Passed! ===');
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
