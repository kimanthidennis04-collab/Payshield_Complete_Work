/**
 * PAYSHIELD — 14-STEP CRITICAL BUSINESS WORKFLOW VERIFICATION
 *
 * Sequence:
 *  1. Log in.
 *  2. Create or select an organization.
 *  3. Add a client.
 *  4. Create a quotation.
 *  5. Create an invoice worth KSh 10,000.
 *  6. Verify tax calculations.
 *  7. Record KSh 4,000 as a partial payment.
 *  8. Confirm KSh 6,000 remains outstanding.
 *  9. Record the remaining KSh 6,000.
 * 10. Confirm the invoice becomes fully paid.
 * 11. Confirm the dashboard updates.
 * 12. Check the client's payment history.
 * 13. [Step 13 executed externally: Server restart]
 * 14. Confirm the records persist.
 */

const http = require('http');

const API_HOST = '127.0.0.1';
const API_PORT = 3000;

function httpRequest(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: API_HOST,
        port: API_PORT,
        path,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch (e) {
            data = raw;
          }
          resolve({ status: res.statusCode, data });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runStep1To12() {
  console.log('\n======================================================');
  console.log('💼 PAYSHIELD 14-STEP CRITICAL BUSINESS WORKFLOW');
  console.log('======================================================\n');

  const ts = Date.now();
  const testEmail = `workflow-${ts}@payshield-test.com`;
  const testPassword = `WorkflowPass!${ts}`;
  const orgName = `Tsunza Enterprise ${ts}`;

  // STEP 1 & 2: Register user, create organization & Log in
  console.log('--- Step 1 & 2: User Onboarding, Organization Setup & Login ---');
  const signupRes = await httpRequest('/api/auth/signup', 'POST', {
    name: 'Workflow Admin',
    email: testEmail,
    password: testPassword,
    businessName: orgName,
    country: 'Kenya',
    currency: 'KES',
  });
  assert(signupRes.status === 201 && signupRes.data.token, '1. User registered and token returned');
  const orgId = signupRes.data.organization.id;
  assert(orgId, `2. Organization "${orgName}" created (Currency: KES)`);

  // Verify login with credentials
  const loginRes = await httpRequest('/api/auth/login', 'POST', {
    email: testEmail,
    password: testPassword,
  });
  assert(loginRes.status === 200 && loginRes.data.token, '2.1 Logged in successfully with JWT issuance');
  const token = loginRes.data.token;

  // STEP 3: Add a client
  console.log('\n--- Step 3: Add Client ---');
  const clientRes = await httpRequest(
    '/api/clients',
    'POST',
    {
      name: 'Apex Sovereign Logistics Ltd',
      email: `billing-${ts}@apexlogistics.co.ke`,
      phone: '+254711998877',
      address: 'Mombasa Road Business Park, Nairobi',
      country: 'Kenya',
    },
    token
  );
  assert(clientRes.status === 201 && clientRes.data.client.id, '3. Client "Apex Sovereign Logistics Ltd" created');
  const clientId = clientRes.data.client.id;

  // STEP 4: Create a quotation
  console.log('\n--- Step 4: Create Quotation ---');
  const quoteRes = await httpRequest(
    '/api/quotes',
    'POST',
    {
      clientId,
      items: [
        {
          description: 'Payment Escrow Protocol & Deliverable Shield Setup',
          quantity: 1,
          unitPrice: 10000,
        },
      ],
      taxRate: 0.16,
      pricingType: 'EXCLUSIVE',
      notes: 'Standard 30-day payment term',
    },
    token
  );
  assert(quoteRes.status === 201 && quoteRes.data.quote.id, '4. Quotation created with subtotal and VAT');
  const quoteId = quoteRes.data.quote.id;
  assert(quoteRes.data.quote.total === 11600, `4.1 Quote total calculated correctly (Total: KES ${quoteRes.data.quote.total})`);

  // STEP 5 & 6: Create an invoice worth KSh 10,000 and verify tax calculation
  console.log('\n--- Step 5 & 6: Create Invoice worth KSh 10,000 & Verify Tax ---');
  const invoiceRes = await httpRequest(
    '/api/invoices',
    'POST',
    {
      clientId,
      items: [
        {
          description: 'Custom Enterprise Deliverable & Escrow Protection',
          quantity: 1,
          unitPrice: 10000,
        },
      ],
      taxExempt: true, // Specific requirement: exactly KSh 10,000 invoice total
      taxRate: 0,
      pricingType: 'EXCLUSIVE',
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      notes: 'Deliverable locked by PayShield Escrow until full settlement',
    },
    token
  );
  assert(invoiceRes.status === 201 && invoiceRes.data.invoice.id, '5. Invoice worth KSh 10,000 created');
  const invoice = invoiceRes.data.invoice;
  const invoiceId = invoice.id;
  assert(invoice.total === 10000, `5.1 Confirmed Invoice Total is exactly KSh 10,000 (Actual: KES ${invoice.total})`);
  assert(invoice.subtotal === 10000, `6. Subtotal verified at KSh 10,000 (Actual: KES ${invoice.subtotal})`);
  assert(invoice.tax === 0, `6.1 Tax calculation verified (Tax: KES ${invoice.tax})`);
  assert(invoice.balance === 10000, `6.2 Initial Balance verified at KSh 10,000`);
  assert(invoice.status === 'PENDING', `6.3 Initial Invoice status verified as PENDING`);

  // Attach Deliverable Shield to ensure escrow logic operates
  const delivRes = await httpRequest(
    '/api/deliverables',
    'POST',
    {
      invoiceId,
      name: 'Apex_Sovereign_Custom_Core_v2.tar.gz',
      filePath: 'vault/deliverables/Apex_Sovereign_Custom_Core_v2.tar.gz',
      fileSize: 48000000,
      fileType: 'application/gzip',
      isProtected: true,
    },
    token
  );
  assert(delivRes.status === 201, '6.4 Deliverable Shield attached and armed');
  const delivId = delivRes.data.deliverable.id;

  // Verify access is blocked prior to payment
  const accessBefore = await httpRequest(`/api/deliverables/${delivId}/access`, 'GET', null, token);
  assert(accessBefore.data.allowed === false, '6.5 Escrow access correctly blocked prior to payment');

  // STEP 7: Record KSh 4,000 partial payment
  console.log('\n--- Step 7 & 8: Record KSh 4,000 Partial Payment & Confirm KSh 6,000 Outstanding ---');
  const partialRes = await httpRequest(
    '/api/payments',
    'POST',
    {
      invoiceId,
      amount: 4000,
      method: 'MPESA',
      reference: `MP-PART-4000-${ts}`,
    },
    token
  );
  assert(partialRes.status === 201, '7. Partial payment of KSh 4,000 recorded successfully');

  // STEP 8: Confirm KSh 6,000 remains outstanding
  const invAfterPartial = await httpRequest(`/api/invoices/${invoiceId}`, 'GET', null, token);
  assert(invAfterPartial.data.invoice.amountPaid === 4000, '8. Confirmed amount paid is KSh 4,000');
  assert(invAfterPartial.data.invoice.balance === 6000, `8.1 Confirmed exactly KSh 6,000 remains outstanding (Balance: KES ${invAfterPartial.data.invoice.balance})`);
  assert(invAfterPartial.data.invoice.status === 'PARTIAL', '8.2 Confirmed invoice status transitioned to PARTIAL');

  // STEP 9: Record remaining KSh 6,000
  console.log('\n--- Step 9 & 10: Record Remaining KSh 6,000 & Confirm Fully Paid ---');
  const finalRes = await httpRequest(
    '/api/payments',
    'POST',
    {
      invoiceId,
      amount: 6000,
      method: 'BANK_TRANSFER',
      reference: `BK-FULL-6000-${ts}`,
    },
    token
  );
  assert(finalRes.status === 201, '9. Remaining payment of KSh 6,000 recorded successfully');

  // STEP 10: Confirm the invoice becomes fully paid
  const invAfterFull = await httpRequest(`/api/invoices/${invoiceId}`, 'GET', null, token);
  assert(invAfterFull.data.invoice.amountPaid === 10000, '10. Confirmed total amount paid is KSh 10,000');
  assert(invAfterFull.data.invoice.balance === 0, '10.1 Confirmed remaining balance is KSh 0');
  assert(invAfterFull.data.invoice.status === 'PAID', '10.2 Confirmed invoice status automatically transitioned to PAID');

  // Confirm Deliverable Shield unlocked automatically
  const accessAfter = await httpRequest(`/api/deliverables/${delivId}/access`, 'GET', null, token);
  assert(accessAfter.data.allowed === true, '10.3 Deliverable Shield unlocked automatically upon full settlement');

  // STEP 11: Confirm dashboard updates
  console.log('\n--- Step 11: Confirm Dashboard Updates ---');
  const dashRes = await httpRequest('/api/dashboard/metrics', 'GET', null, token);
  assert(dashRes.status === 200, '11. Dashboard metrics retrieved successfully');
  const metrics = dashRes.data.metrics;
  assert(metrics.totalRevenue === 10000, `11.1 Dashboard total revenue reflects verified KSh 10,000 (Actual: KES ${metrics.totalRevenue})`);
  assert(metrics.totalPayments === 2, `11.2 Dashboard total payments count reflects 2 transactions (Actual: ${metrics.totalPayments})`);
  assert(metrics.outstandingInvoices === 0, `11.3 Outstanding invoices count is 0 (Actual: ${metrics.outstandingInvoices})`);

  // STEP 12: Check client's payment history
  console.log('\n--- Step 12: Check Client Payment History & Ledger ---');
  const clientDetail = await httpRequest(`/api/clients/${clientId}`, 'GET', null, token);
  assert(clientDetail.status === 200, '12. Client profile and financial history retrieved');
  const c = clientDetail.data.client;
  assert(c.invoices && c.invoices.length === 1, '12.1 Client invoice history includes the KSh 10,000 invoice');
  assert(c.invoices[0].payments && c.invoices[0].payments.length === 2, '12.2 Client ledger contains both payment transactions (KSh 4,000 and KSh 6,000)');

  console.log('\n======================================================');
  console.log('✅ STEPS 1 THROUGH 12 COMPLETED & VERIFIED SUCCESSFULLY');
  console.log('======================================================\n');

  // Output test identifiers for persistence verification in Step 14
  console.log(
    JSON.stringify({
      email: testEmail,
      orgId,
      clientId,
      invoiceId,
      delivId,
    })
  );
}

runStep1To12().catch((err) => {
  console.error('Workflow error:', err);
  process.exit(1);
});
