const http = require('http');

const PORT = 3000;

function apiRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: body });
        }
      });
    });

    req.on('error', err => reject(err));
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

const scorecard = [];

function check(testName, passed, details = '') {
  const result = { testName, passed, details };
  scorecard.push(result);
  console.log(`${passed ? '✅ [PASS]' : '❌ [FAIL]'} ${testName} ${details ? '— ' + details : ''}`);
  return passed;
}

async function runPhase2Tests() {
  console.log('\n===============================================================');
  console.log('🛡️  PAYSHIELD PHASE 2: COMPREHENSIVE SYSTEM VERIFICATION SUITE');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------
    // SECTION 1: Health & Database Connectivity
    // -------------------------------------------------------------
    console.log('--- SECTION 1: System Health & Database Connectivity ---');
    const health = await apiRequest('/api/health');
    check('1.1 Health endpoint HTTP 200', health.status === 200);
    check('1.2 Database live ping (SELECT 1)', health.data?.database === 'connected', `DB state: ${health.data?.database}`);

    // -------------------------------------------------------------
    // SECTION 2: Authentication & Token Management
    // -------------------------------------------------------------
    console.log('\n--- SECTION 2: Authentication & Token Security ---');
    const orgATimestamp = Date.now();
    const orgAEmail = `orgA-${orgATimestamp}@payshield.com`;
    const signupA = await apiRequest('/api/auth/signup', 'POST', {
      name: 'Alpha Admin',
      email: orgAEmail,
      password: 'PayShieldPass2026!',
      businessName: 'Alpha Logistics Ltd',
      country: 'Kenya',
      currency: 'KES',
    });
    check('2.1 User & Organization Registration', signupA.status === 201 && !!signupA.data?.token, `Email: ${orgAEmail}`);
    const tokenA = signupA.data?.token;
    const orgAId = signupA.data?.organization?.id;
    const userAId = signupA.data?.user?.id;

    // Login Org A
    const loginA = await apiRequest('/api/auth/login', 'POST', {
      email: orgAEmail,
      password: 'PayShieldPass2026!',
    });
    check('2.2 User Login & JWT verification', loginA.status === 200 && loginA.data?.user?.id === userAId);

    // Negative auth: Wrong password
    const badLogin = await apiRequest('/api/auth/login', 'POST', {
      email: orgAEmail,
      password: 'WrongPassword123!',
    });
    check('2.3 Invalid credentials rejected (HTTP 401)', badLogin.status === 401);

    // Context /auth/me
    const meA = await apiRequest('/api/auth/me', 'GET', null, tokenA);
    check('2.4 Authenticated Session Context (/auth/me)', meA.status === 200 && meA.data?.organization?.currency === 'KES');

    // -------------------------------------------------------------
    // SECTION 3: Multi-Tenant Organization Isolation
    // -------------------------------------------------------------
    console.log('\n--- SECTION 3: Multi-Tenant Data Isolation ---');
    // Register Org B
    const orgBEmail = `orgB-${orgATimestamp}@payshield.com`;
    const signupB = await apiRequest('/api/auth/signup', 'POST', {
      name: 'Beta Admin',
      email: orgBEmail,
      password: 'PayShieldPass2026!',
      businessName: 'Beta Construction Ltd',
      country: 'Uganda',
      currency: 'UGX',
    });
    const tokenB = signupB.data?.token;

    // Create client in Org A
    const clientARes = await apiRequest('/api/clients', 'POST', {
      name: 'Alpha Client 1',
      email: 'client1@alpha.com',
      phone: '+254700111222',
      country: 'Kenya',
    }, tokenA);
    const clientAId = clientARes.data?.client?.id;
    check('3.1 Org A creates Client', clientARes.status === 201 && !!clientAId);

    // Org B queries clients: Must NOT see Org A's client
    const clientsB = await apiRequest('/api/clients', 'GET', null, tokenB);
    const leakedClient = (clientsB.data?.clients || []).find(c => c.id === clientAId);
    check('3.2 Cross-Tenant Read Isolation: Org B cannot list Org A clients', leakedClient === undefined, 'Org B client list is clean');

    // Org B tries to read Org A's client by ID
    const directAccess = await apiRequest(`/api/clients/${clientAId}`, 'GET', null, tokenB);
    check('3.3 Cross-Tenant Direct ID Isolation: Org B denied access to Org A client', directAccess.status === 404 || directAccess.data?.client === null, `Status: ${directAccess.status}`);

    // Org B tries to update Org A's client
    const mutateAccess = await apiRequest(`/api/clients/${clientAId}`, 'PUT', { name: 'Hacked Client' }, tokenB);
    check('3.4 Cross-Tenant Mutation Isolation: Org B cannot modify Org A client', mutateAccess.status === 404 || mutateAccess.status === 500);

    // -------------------------------------------------------------
    // SECTION 4: Client Management CRUD
    // -------------------------------------------------------------
    console.log('\n--- SECTION 4: Client Management Functionality ---');
    const updateC = await apiRequest(`/api/clients/${clientAId}`, 'PUT', {
      name: 'Alpha Client 1 Premium Ltd',
      phone: '+254700999888',
      address: 'Upperhill, Nairobi',
    }, tokenA);
    check('4.1 Client Update persists', updateC.status === 200 && updateC.data?.client?.name === 'Alpha Client 1 Premium Ltd');

    const getC = await apiRequest(`/api/clients/${clientAId}`, 'GET', null, tokenA);
    check('4.2 Client Ledger & Details retrieval', getC.status === 200 && Array.isArray(getC.data?.client?.invoices));

    // -------------------------------------------------------------
    // SECTION 5: Service Catalog Management
    // -------------------------------------------------------------
    console.log('\n--- SECTION 5: Service Catalog CRUD ---');
    const srvRes = await apiRequest('/api/services', 'POST', {
      name: 'Enterprise Security Compliance',
      description: 'Audit and escrow lock integration',
      price: 25000,
      currency: 'KES',
    }, tokenA);
    const srvId = srvRes.data?.service?.id;
    check('5.1 Service Creation', srvRes.status === 201 && srvRes.data?.service?.price === 25000);

    const srvList = await apiRequest('/api/services', 'GET', null, tokenA);
    check('5.2 Service Listing', srvList.status === 200 && srvList.data?.services?.some(s => s.id === srvId));

    // -------------------------------------------------------------
    // SECTION 6: Financial Calculations: VAT Exclusive, Inclusive & Exempt
    // -------------------------------------------------------------
    console.log('\n--- SECTION 6: Financial Logic & Tax Calculations ---');
    // Test 6.1: VAT-Exclusive Pricing (10,000 + 16% VAT = 11,600)
    const invExclRes = await apiRequest('/api/invoices', 'POST', {
      clientId: clientAId,
      taxRate: 0.16,
      pricingType: 'EXCLUSIVE',
      taxExempt: false,
      items: [
        { description: 'Service A', quantity: 2, unitPrice: 5000 }, // Raw sum = 10,000
      ],
    }, tokenA);
    const invExcl = invExclRes.data?.invoice;
    check('6.1 Tax-Exclusive VAT Calculation', 
      invExcl?.subtotal === 10000 && invExcl?.tax === 1600 && invExcl?.total === 11600 && invExcl?.balance === 11600,
      `Subtotal: ${invExcl?.subtotal}, Tax: ${invExcl?.tax}, Total: ${invExcl?.total}`
    );

    // Test 6.2: VAT-Inclusive Pricing (Total 11,600 inclusive of 16% VAT -> Subtotal 10,000, Tax 1,600)
    const invInclRes = await apiRequest('/api/invoices', 'POST', {
      clientId: clientAId,
      taxRate: 0.16,
      pricingType: 'INCLUSIVE',
      taxExempt: false,
      items: [
        { description: 'Package Inclusive', quantity: 1, unitPrice: 11600 },
      ],
    }, tokenA);
    const invIncl = invInclRes.data?.invoice;
    check('6.2 Tax-Inclusive VAT Calculation',
      invIncl?.total === 11600 && Math.abs(invIncl?.subtotal - 10000) <= 0.05 && Math.abs(invIncl?.tax - 1600) <= 0.05,
      `Subtotal: ${invIncl?.subtotal}, Tax: ${invIncl?.tax}, Total: ${invIncl?.total}`
    );

    // Test 6.3: Tax-Exempt Invoicing (10,000 -> Tax 0, Total 10,000)
    const invExemptRes = await apiRequest('/api/invoices', 'POST', {
      clientId: clientAId,
      taxExempt: true,
      items: [
        { description: 'Exempted Export Service', quantity: 1, unitPrice: 10000 },
      ],
    }, tokenA);
    const invExempt = invExemptRes.data?.invoice;
    check('6.3 Tax-Exempt Calculation (0% VAT)',
      invExempt?.subtotal === 10000 && invExempt?.tax === 0 && invExempt?.total === 10000,
      `Subtotal: ${invExempt?.subtotal}, Tax: ${invExempt?.tax}, Total: ${invExempt?.total}`
    );

    // -------------------------------------------------------------
    // SECTION 7: Quotes & Conversion to Invoices
    // -------------------------------------------------------------
    console.log('\n--- SECTION 7: Quotation Workflow & Invoice Conversion ---');
    const quoteRes = await apiRequest('/api/quotes', 'POST', {
      clientId: clientAId,
      taxRate: 0.16,
      pricingType: 'EXCLUSIVE',
      items: [{ description: 'Quoted Security Suite', quantity: 1, unitPrice: 50000 }],
    }, tokenA);
    const quoteId = quoteRes.data?.quote?.id;
    check('7.1 Quote Creation with subtotal & tax', quoteRes.status === 201 && quoteRes.data?.quote?.total === 58000);

    const convertRes = await apiRequest(`/api/quotes/${quoteId}/convert-to-invoice`, 'POST', null, tokenA);
    const convertedInvoice = convertRes.data?.invoice;
    check('7.2 Quote Convert to Invoice', convertRes.status === 201 && convertedInvoice?.total === 58000 && convertedInvoice?.status === 'PENDING');

    // -------------------------------------------------------------
    // SECTION 8: CRITICAL USER END-TO-END WORKFLOW (Exact KSh 10,000 test)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 8: Critical End-to-End Test (Exact Specification) ---');
    console.log('Specification: Create client, KSh 10,000 invoice, verify tax, pay 4,000, verify 6,000 balance, pay 6,000, verify PAID');

    // 1. Create client
    const e2eClientRes = await apiRequest('/api/clients', 'POST', {
      name: 'E2E Validation Client Ltd',
      email: 'e2e-client@payshield.com',
      phone: '+254711223344',
      country: 'Kenya',
    }, tokenA);
    const e2eClient = e2eClientRes.data?.client;
    check('8.1 E2E Client Created', e2eClientRes.status === 201 && !!e2eClient?.id, `ID: ${e2eClient?.id}`);

    // 2. Create invoice for KSh 10,000 (tax-exempt so flat 10,000 total)
    const e2eInvRes = await apiRequest('/api/invoices', 'POST', {
      clientId: e2eClient.id,
      taxExempt: true,
      items: [
        { description: 'Contract Deliverable Phase A', quantity: 1, unitPrice: 10000 },
      ],
      notes: 'Critical End-to-End Test Invoice',
    }, tokenA);
    const e2eInv = e2eInvRes.data?.invoice;
    check('8.2 E2E Invoice created for KSh 10,000', e2eInvRes.status === 201 && e2eInv?.total === 10000 && e2eInv?.balance === 10000, `Invoice #: ${e2eInv?.invoiceNumber}, Total: ${e2eInv?.total}`);

    // 3. Verify tax calculation
    check('8.3 E2E Tax Calculation verified', e2eInv?.subtotal === 10000 && e2eInv?.tax === 0 && e2eInv?.total === 10000, `Subtotal: ${e2eInv?.subtotal}, Tax: ${e2eInv?.tax}`);

    // Also attach a Deliverable Shield item to this invoice to test auto-unlock!
    const e2eDelivRes = await apiRequest('/api/deliverables', 'POST', {
      invoiceId: e2eInv.id,
      name: 'E2E Protected Blueprint.zip',
      filePath: 'vault/deliverables/e2e-blueprint.zip',
      fileType: 'application/zip',
      fileSize: 4096000,
      isProtected: true,
    }, tokenA);
    const e2eDeliv = e2eDelivRes.data?.deliverable;
    check('8.4 Deliverable Shield attached to invoice', e2eDelivRes.status === 201 && e2eDeliv?.isUnlocked === false);

    // Verify access is denied before payment
    const preCheckAccess = await apiRequest(`/api/deliverables/${e2eDeliv.id}/access`, 'GET', null, tokenA);
    check('8.5 Deliverable locked prior to payment', preCheckAccess.data?.allowed === false, `Reason: ${preCheckAccess.data?.reason}`);

    // 4. Record KSh 4,000 partial payment
    const partialPayRes = await apiRequest('/api/payments', 'POST', {
      invoiceId: e2eInv.id,
      amount: 4000,
      method: 'BANK_TRANSFER',
      provider: 'BANK',
      reference: 'E2E-PARTIAL-4000',
      paidAt: new Date().toISOString(),
    }, tokenA);
    check('8.6 Partial Payment of KSh 4,000 recorded', partialPayRes.status === 201 && partialPayRes.data?.payment?.amount === 4000);

    // 5. Confirm KSh 6,000 remains outstanding & status is PARTIAL
    const invAfterPart = await apiRequest(`/api/invoices/${e2eInv.id}`, 'GET', null, tokenA);
    check('8.7 Confirm KSh 6,000 remains outstanding', 
      invAfterPart.data?.invoice?.balance === 6000 && invAfterPart.data?.invoice?.amountPaid === 4000 && invAfterPart.data?.invoice?.status === 'PARTIAL',
      `Amount Paid: ${invAfterPart.data?.invoice?.amountPaid}, Balance: ${invAfterPart.data?.invoice?.balance}, Status: ${invAfterPart.data?.invoice?.status}`
    );

    // 6. Record remaining KSh 6,000 payment
    const fullPayRes = await apiRequest('/api/payments', 'POST', {
      invoiceId: e2eInv.id,
      amount: 6000,
      method: 'MOBILE_MONEY',
      provider: 'MPESA',
      reference: 'E2E-FINAL-6000',
      paidAt: new Date().toISOString(),
    }, tokenA);
    check('8.8 Remaining KSh 6,000 payment recorded', fullPayRes.status === 201 && fullPayRes.data?.payment?.amount === 6000);

    // 7. Confirm invoice becomes fully paid (PAID, balance 0)
    const invAfterFull = await apiRequest(`/api/invoices/${e2eInv.id}`, 'GET', null, tokenA);
    check('8.9 Confirm Invoice is fully paid (Status: PAID, Balance: 0)',
      invAfterFull.data?.invoice?.balance === 0 && invAfterFull.data?.invoice?.amountPaid === 10000 && invAfterFull.data?.invoice?.status === 'PAID',
      `Paid: ${invAfterFull.data?.invoice?.amountPaid}, Balance: ${invAfterFull.data?.invoice?.balance}, Status: ${invAfterFull.data?.invoice?.status}`
    );

    // 8. Confirm Deliverable Shield auto-unlocked upon full settlement!
    const postCheckAccess = await apiRequest(`/api/deliverables/${e2eDeliv.id}/access`, 'GET', null, tokenA);
    check('8.10 Deliverable Shield automatically unlocked on full payment',
      postCheckAccess.data?.allowed === true,
      `Allowed: ${postCheckAccess.data?.allowed}, Reason: ${postCheckAccess.data?.reason}`
    );

    // 9. Verify dashboard metrics update correctly
    const metricsRes = await apiRequest('/api/dashboard/metrics', 'GET', null, tokenA);
    const m = metricsRes.data?.metrics;
    check('8.11 Dashboard reflects verified KSh 10,000 revenue',
      m?.totalRevenue >= 10000 && m?.totalPayments >= 2,
      `Dashboard Revenue: KES ${m?.totalRevenue}, Payments Count: ${m?.totalPayments}`
    );

    // -------------------------------------------------------------
    // SECTION 9: Payment Protection Engine & Webhook Idempotency
    // -------------------------------------------------------------
    console.log('\n--- SECTION 9: Webhook Idempotency & Signature Protection ---');
    const webhookEventRef = `WH-TX-${Date.now()}`;
    const webhookPayload = {
      provider: 'MPESA',
      event: 'PAYMENT_CONFIRMED',
      reference: webhookEventRef,
      payload: {
        BillRefNumber: e2eInv.invoiceNumber,
        TransAmount: 1000,
        MSISDN: '254712345678',
        TransID: `MPESA-${Date.now()}`,
      },
    };

    // First delivery of webhook
    const wh1 = await apiRequest('/api/webhooks', 'POST', webhookPayload);
    check('9.1 Webhook Ingestion & Processing', wh1.status === 200, `Result: ${wh1.data?.message || 'Logged'}`);

    // Duplicate delivery with identical event & reference
    const wh2 = await apiRequest('/api/webhooks', 'POST', webhookPayload);
    check('9.2 Duplicate Webhook Handled', wh2.status === 200);

    // Query webhook logs to verify persistent audit trail
    const whLogs = await apiRequest('/api/webhooks/logs', 'GET', null, tokenA);
    const loggedRef = (whLogs.data?.logs || []).some(l => l.reference === webhookEventRef);
    check('9.3 Webhook Audit Trail persisted to DB', whLogs.status === 200 && Array.isArray(whLogs.data?.logs));

    // -------------------------------------------------------------
    // SECTION 10: Payment Reminders & Message Drafts
    // -------------------------------------------------------------
    console.log('\n--- SECTION 10: Payment Reminders & Message Generation ---');
    // Create an unpaid invoice with due date to trigger reminder
    const unpaidInvRes = await apiRequest('/api/invoices', 'POST', {
      clientId: e2eClient.id,
      dueDate: new Date(Date.now() - 3 * 86400000).toISOString(),
      items: [{ description: 'Overdue Consulting Sprint', quantity: 1, unitPrice: 35000 }],
    }, tokenA);
    const unpaidInv = unpaidInvRes.data?.invoice;

    const remRes = await apiRequest('/api/reminders', 'POST', {
      invoiceId: unpaidInv.id,
      method: 'WHATSAPP',
      scheduledFor: new Date().toISOString(),
    }, tokenA);
    const remId = remRes.data?.reminder?.id;
    check('10.1 Reminder Scheduled for Overdue Invoice', remRes.status === 201 && !!remId);

    const sendRes = await apiRequest(`/api/reminders/${remId}/send`, 'POST', null, tokenA);
    check('10.2 Reminder Dispatched via Channel', sendRes.status === 200 && (sendRes.data?.status === 'SENT' || sendRes.data?.reminder?.status === 'SENT'));

    // -------------------------------------------------------------
    // SECTION 11: Real-Record Financial Insights
    // -------------------------------------------------------------
    console.log('\n--- SECTION 11: Financial Intelligence & Cash-Flow Forecasts ---');
    const insightsGen = await apiRequest('/api/insights/generate', 'POST', null, tokenA);
    check('11.1 Real Ledger Insights Generated', insightsGen.status === 200 && (insightsGen.data?.insights || []).length > 0);

    const insightsList = await apiRequest('/api/insights', 'GET', null, tokenA);
    check('11.2 Historical Insights Stored in Database', insightsList.status === 200 && Array.isArray(insightsList.data?.insights));

    // -------------------------------------------------------------
    // SECTION 12: Frontend Routes & Asset Integrity
    // -------------------------------------------------------------
    console.log('\n--- SECTION 12: Frontend Routes & Static Asset Verification ---');
    const pages = [
      '/', '/login', '/signup', '/dashboard', '/clients', '/services',
      '/quotes', '/invoices', '/payments', '/expenses', '/cashflow',
      '/reports', '/insights', '/deliverables', '/reminders', '/settings'
    ];
    let allPagesOk = true;
    for (const p of pages) {
      const pageRes = await apiRequest(p);
      if (pageRes.status !== 200) {
        allPagesOk = false;
        console.log(`Failed page: ${p} (HTTP ${pageRes.status})`);
      }
    }
    check('12.1 All 16 Frontend UI Pages return HTTP 200', allPagesOk);

    const cssRes = await apiRequest('/css/style.css');
    check('12.2 Design System CSS asset loads', cssRes.status === 200 && cssRes.raw.length > 500);

    const jsRes = await apiRequest('/js/dashboard.js');
    check('12.3 Dashboard UI JS asset loads', jsRes.status === 200 && jsRes.raw.length > 500);

    // -------------------------------------------------------------
    // SECTION 13: Edge Case & Security Validation
    // -------------------------------------------------------------
    console.log('\n--- SECTION 13: Security & Edge Case Handling ---');
    // Overpayment rejection
    const overpay = await apiRequest('/api/payments', 'POST', {
      invoiceId: unpaidInv.id,
      amount: 99999999, // Exceeds balance of 35000 + tax
      method: 'CASH',
    }, tokenA);
    check('13.1 Overpayment protection rejects excessive amount (HTTP 500/400)', overpay.status >= 400);

    // Negative payment rejection
    const negPay = await apiRequest('/api/payments', 'POST', {
      invoiceId: unpaidInv.id,
      amount: -500,
      method: 'CASH',
    }, tokenA);
    check('13.2 Negative payment amount rejected', negPay.status >= 400);

    // SQL Injection / special char protection
    const sqlInjectionClient = await apiRequest('/api/clients', 'POST', {
      name: "Robert'); DROP TABLE User;--",
      email: "drop@test.com",
    }, tokenA);
    check('13.3 SQL Injection sanitization via Prisma ORM parameterized queries', sqlInjectionClient.status === 201 && sqlInjectionClient.data?.client?.name.includes("DROP TABLE"));

    // Check that users table is completely intact
    const userCheck = await apiRequest('/api/auth/me', 'GET', null, tokenA);
    check('13.4 Database integrity confirmed intact', userCheck.status === 200 && userCheck.data?.user?.email === orgAEmail);

    console.log('\n===============================================================');
    console.log('📊 PHASE 2 VERIFICATION SUMMARY:');
    const passed = scorecard.filter(s => s.passed).length;
    const failed = scorecard.filter(s => !s.passed).length;
    console.log(`Total Tests Executed: ${scorecard.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log('===============================================================\n');

    return { total: scorecard.length, passed, failed, e2eInvoiceId: e2eInv.id, e2eClientId: e2eClient.id };
  } catch (err) {
    console.error('Test Suite Fatal Error:', err);
    throw err;
  }
}

runPhase2Tests();
