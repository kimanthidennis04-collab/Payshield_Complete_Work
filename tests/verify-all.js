const http = require('http');

const PORT = 3000;
let testToken = '';
let testUser = null;
let testOrg = null;
let testClient = null;
let testService = null;
let testQuote = null;
let testInvoice = null;
let testDeliverable = null;
let testReminder = null;
let testPayment = null;

const results = [];

function recordResult(testName, passed, details = '') {
  results.push({ testName, status: passed ? 'PASS' : 'FAIL', details });
  console.log(`${passed ? '✅ [PASS]' : '❌ [FAIL]'} ${testName} ${details ? '(' + details + ')' : ''}`);
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };
    if (testToken) {
      defaultHeaders['Authorization'] = `Bearer ${testToken}`;
    }

    const reqOptions = {
      hostname: 'localhost',
      port: PORT,
      path: options.path,
      method: options.method || 'GET',
      headers: { ...defaultHeaders, ...options.headers },
    };

    const req = http.request(reqOptions, (res) => {
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

async function runVerificationSuite() {
  console.log('\n======================================================');
  console.log('🚀 PAYSHIELD COMPLETE SYSTEM INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  try {
    // 1. Health check & database connection
    const health = await request({ path: '/api/health' });
    recordResult(
      '1. Backend Startup & Database Health',
      health.status === 200 && health.data?.database === 'connected',
      `Status: ${health.status}, DB: ${health.data?.database}`
    );

    // 2. Authentication: Signup
    const testEmail = `verify-${Date.now()}@payshield.com`;
    const signup = await request({ path: '/api/auth/signup', method: 'POST' }, {
      name: 'Verification Officer',
      email: testEmail,
      password: 'PayShieldSecure2026!',
      businessName: 'Apex Shield Technologies',
      country: 'Kenya',
      currency: 'KES',
    });
    testToken = signup.data?.token;
    testUser = signup.data?.user;
    testOrg = signup.data?.organization;
    recordResult(
      '2. Registration & JWT Generation',
      signup.status === 201 && !!testToken,
      `User: ${testEmail}, Org: ${testOrg?.name}`
    );

    // 3. Authentication: Login
    const login = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: testEmail,
      password: 'PayShieldSecure2026!',
    });
    recordResult(
      '3. Login & Session Verification',
      login.status === 200 && login.data?.success === true,
      `Token refreshed, User ID: ${login.data?.user?.id}`
    );

    // 4. Auth Me Context
    const me = await request({ path: '/api/auth/me' });
    recordResult(
      '4. Current User & Org Context (/auth/me)',
      me.status === 200 && me.data?.user?.email === testEmail,
      `Org Currency: ${me.data?.organization?.currency}`
    );

    // 5. Client Management: Create
    const clientRes = await request({ path: '/api/clients', method: 'POST' }, {
      name: 'Safaricom Enterprise Solutions',
      email: 'enterprise@safaricom.co.ke',
      phone: '+254722000000',
      address: 'HQ Westlands, Nairobi',
      country: 'Kenya',
    });
    testClient = clientRes.data?.client;
    recordResult(
      '5. Client Creation & Persistence',
      clientRes.status === 201 && !!testClient?.id,
      `Client ID: ${testClient?.id}, Name: ${testClient?.name}`
    );

    // 6. Client Management: Update
    const clientUpdate = await request({ path: `/api/clients/${testClient.id}`, method: 'PUT' }, {
      name: 'Safaricom Enterprise Solutions Ltd',
      phone: '+254722111222',
    });
    recordResult(
      '6. Client Update Functionality',
      clientUpdate.status === 200 && clientUpdate.data?.client?.name.includes('Ltd'),
      `Updated name: ${clientUpdate.data?.client?.name}`
    );

    // 7. Service Catalog: Create
    const serviceRes = await request({ path: '/api/services', method: 'POST' }, {
      name: 'Cloud Security Audit & Deliverable Escrow',
      description: 'End-to-end security inspection and certified deliverable package',
      price: 50000.00,
      currency: 'KES',
    });
    testService = serviceRes.data?.service;
    recordResult(
      '7. Service Catalog Management',
      serviceRes.status === 201 && testService?.price === 50000,
      `Service: ${testService?.name}, Price: KES ${testService?.price}`
    );

    // 8. Quote: Creation with Line Items and Tax Calculations
    const quoteRes = await request({ path: '/api/quotes', method: 'POST' }, {
      clientId: testClient.id,
      taxRate: 0.16,
      pricingType: 'EXCLUSIVE',
      validUntil: new Date(Date.now() + 14 * 86400000).toISOString(),
      items: [
        { serviceId: testService.id, description: 'Core Security Audit', quantity: 2, unitPrice: 50000 },
        { description: 'Escrow Key Management', quantity: 1, unitPrice: 20000 },
      ],
      notes: 'Terms: 14 days proposal validity.',
    });
    testQuote = quoteRes.data?.quote;
    // Expected: subtotal 120,000, tax 16% = 19,200, total = 139,200
    const quoteMathPassed = testQuote?.subtotal === 120000 && testQuote?.tax === 19200 && testQuote?.total === 139200;
    recordResult(
      '8. Quote Creation with VAT Calculation (16%)',
      quoteRes.status === 201 && quoteMathPassed,
      `Subtotal: ${testQuote?.subtotal}, VAT: ${testQuote?.tax}, Total: ${testQuote?.total}`
    );

    // 9. Quote Conversion to Invoice
    const convertRes = await request({ path: `/api/quotes/${testQuote.id}/convert-to-invoice`, method: 'POST' });
    testInvoice = convertRes.data?.invoice;
    recordResult(
      '9. Quote to Invoice Conversion',
      convertRes.status === 201 && !!testInvoice?.invoiceNumber,
      `Generated Invoice #: ${testInvoice?.invoiceNumber}, Total: ${testInvoice?.total}`
    );

    // 10. Invoice: Update & Pricing Types (Tax Exempt test)
    const updateInvRes = await request({ path: `/api/invoices/${testInvoice.id}`, method: 'PUT' }, {
      taxExempt: true,
      items: [
        { description: 'Core Security Audit (Exempted)', quantity: 2, unitPrice: 50000 },
        { description: 'Escrow Key Management', quantity: 1, unitPrice: 20000 },
      ],
      notes: 'Updated invoice with tax exemption.',
    });
    const invExemptMathPassed = updateInvRes.data?.invoice?.subtotal === 120000 && updateInvRes.data?.invoice?.tax === 0 && updateInvRes.data?.invoice?.total === 120000;
    recordResult(
      '10. Invoice Editing & Tax Exemption Support',
      updateInvRes.status === 200 && invExemptMathPassed,
      `Subtotal: ${updateInvRes.data?.invoice?.subtotal}, VAT: ${updateInvRes.data?.invoice?.tax}, Total: ${updateInvRes.data?.invoice?.total}`
    );

    // 11. Deliverable Shield: Register Protected Asset
    const deliverableRes = await request({ path: '/api/deliverables', method: 'POST' }, {
      invoiceId: testInvoice.id,
      name: 'Certified Penetration Test Report & Encrypted Source.zip',
      filePath: 'vault/deliverables/pentest-source-2026.zip',
      fileType: 'application/zip',
      fileSize: 10485760,
      isProtected: true,
    });
    testDeliverable = deliverableRes.data?.deliverable;
    recordResult(
      '11. Deliverable Shield: Asset Arming',
      deliverableRes.status === 201 && testDeliverable?.isProtected === true && testDeliverable?.isUnlocked === false,
      `Deliverable: ${testDeliverable?.name}, Locked: ${testDeliverable?.isProtected}`
    );

    // 12. Deliverable Shield: Access Denied before payment
    const preCheck = await request({ path: `/api/deliverables/${testDeliverable.id}/access` });
    const isAllowedPre = preCheck.data?.allowed !== undefined ? preCheck.data?.allowed : preCheck.data?.access?.allowed;
    recordResult(
      '12. Deliverable Shield: Access Denied When Unpaid',
      preCheck.status === 200 && isAllowedPre === false,
      `Reason: ${preCheck.data?.reason || preCheck.data?.access?.reason}`
    );

    // 13. Payment: Record Partial Payment
    const partPayRes = await request({ path: '/api/payments', method: 'POST' }, {
      invoiceId: testInvoice.id,
      amount: 50000,
      method: 'BANK_TRANSFER',
      provider: 'BANK',
      reference: 'EFT-TX-883921',
      paidAt: new Date().toISOString(),
    });
    testPayment = partPayRes.data?.payment;
    // Check updated invoice balance
    const invCheck1 = await request({ path: `/api/invoices/${testInvoice.id}` });
    const partBalancePassed = invCheck1.data?.invoice?.balance === 70000 && invCheck1.data?.invoice?.status === 'PARTIAL';
    recordResult(
      '13. Partial Payment Recording & Balance Decrement',
      partPayRes.status === 201 && partBalancePassed,
      `Paid: 50,000, Remaining Balance: ${invCheck1.data?.invoice?.balance}, Status: ${invCheck1.data?.invoice?.status}`
    );

    // 14. Payment: Record Settlement Payment (Invoice reaches 0 balance -> PAID)
    const settlePayRes = await request({ path: '/api/payments', method: 'POST' }, {
      invoiceId: testInvoice.id,
      amount: 70000,
      method: 'MOBILE_MONEY',
      provider: 'MPESA',
      reference: 'MPESA-QRT89291A',
      paidAt: new Date().toISOString(),
    });
    const invCheck2 = await request({ path: `/api/invoices/${testInvoice.id}` });
    const fullPayPassed = invCheck2.data?.invoice?.balance === 0 && invCheck2.data?.invoice?.status === 'PAID';
    recordResult(
      '14. Full Settlement & Automated Status Update to PAID',
      settlePayRes.status === 201 && fullPayPassed,
      `Total Paid: ${invCheck2.data?.invoice?.amountPaid}, Balance: ${invCheck2.data?.invoice?.balance}, Status: ${invCheck2.data?.invoice?.status}`
    );

    // 15. Deliverable Shield: Automated Release Upon Verified Payment
    const postCheck = await request({ path: `/api/deliverables/${testDeliverable.id}/access` });
    const isAllowedPost = postCheck.data?.allowed !== undefined ? postCheck.data?.allowed : postCheck.data?.access?.allowed;
    const delivCheck = await request({ path: `/api/deliverables` });
    const unlockedObj = delivCheck.data?.deliverables?.find(d => d.id === testDeliverable.id);
    const shieldReleased = isAllowedPost === true && unlockedObj?.isUnlocked === true;
    recordResult(
      '15. Deliverable Shield: Automated Release Upon Verified Payment',
      shieldReleased,
      `Allowed: ${isAllowedPost}, Unlocked: ${unlockedObj?.isUnlocked}`
    );

    // 16. Payment Reminder System
    // Create an overdue invoice to test reminders
    const overdueInv = await request({ path: '/api/invoices', method: 'POST' }, {
      clientId: testClient.id,
      dueDate: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days overdue
      items: [{ description: 'Overdue Hardware Support', quantity: 1, unitPrice: 25000 }],
    });
    const reminderRes = await request({ path: '/api/reminders', method: 'POST' }, {
      invoiceId: overdueInv.data?.invoice?.id,
      method: 'WHATSAPP',
      scheduledFor: new Date().toISOString(),
    });
    testReminder = reminderRes.data?.reminder;
    const sendRemRes = await request({ path: `/api/reminders/${testReminder.id}/send`, method: 'POST' });
    const remStatus = sendRemRes.data?.status || sendRemRes.data?.reminder?.status;
    recordResult(
      '16. Payment Reminder Scheduling & Dispatch',
      reminderRes.status === 201 && remStatus === 'SENT',
      `Channel: ${testReminder?.method}, Dispatch: ${remStatus}`
    );

    // 17. Expense Tracking
    const expRes = await request({ path: '/api/expenses', method: 'POST' }, {
      category: 'Software',
      description: 'Annual Cloud Vault Infrastructure',
      amount: 15000,
      currency: 'KES',
      date: new Date().toISOString(),
    });
    recordResult(
      '17. Business Expense Logging',
      expRes.status === 201 && expRes.data?.expense?.amount === 15000,
      `Expense: KES ${expRes.data?.expense?.amount}`
    );

    // 18. Cash Flow Analytics & Date Calculations
    const startStr = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const endStr = new Date().toISOString().split('T')[0];
    const cashFlow = await request({ path: `/api/dashboard/cashflow?startDate=${startStr}&endDate=${endStr}` });
    const cf = cashFlow.data?.cashFlow;
    // Expected: Money received = 120,000, expenses = 15,000, net cash flow = 105,000
    const cfPassed = cf?.moneyReceived >= 120000 && cf?.totalExpenses >= 15000 && cf?.netCashFlow === (cf.moneyReceived - cf.totalExpenses);
    recordResult(
      '18. Cash Flow Engine & Net Margin Calculation',
      cashFlow.status === 200 && cfPassed,
      `Inflow: ${cf?.moneyReceived}, Outflow: ${cf?.totalExpenses}, Net Cash Flow: ${cf?.netCashFlow}`
    );

    // 19. AI / Deterministic Financial Insights Engine
    const insightsRes = await request({ path: '/api/insights/generate', method: 'POST' });
    const insights = insightsRes.data?.insights || [];
    recordResult(
      '19. Financial Insights Engine & Risk Forecasts',
      insightsRes.status === 200 && insights.length > 0,
      `Generated ${insights.length} analytical insights based on real records`
    );

    // 20. Executive Dashboard Live Metrics
    const metricsRes = await request({ path: '/api/dashboard/metrics' });
    const m = metricsRes.data?.metrics;
    const metricsAccurate = m?.totalRevenue >= 120000 && m?.totalPayments >= 2 && m?.clientCount >= 1;
    recordResult(
      '20. Executive Dashboard Real-Time Metrics & Aggregation',
      metricsRes.status === 200 && metricsAccurate,
      `Total Revenue: KES ${m?.totalRevenue}, Payments: ${m?.totalPayments}, Outstanding: KES ${m?.totalOutstanding}`
    );

    console.log('\n======================================================');
    console.log('📊 TEST SUMMARY & SCORECARD:');
    const passedCount = results.filter(r => r.status === 'PASS').length;
    console.log(`Total Passed: ${passedCount} / ${results.length}`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Test Execution Error:', err);
  }
}

runVerificationSuite();
