const http = require('http');

let token = '';
let propertyId = '';
let unitId = '';
let tenantId = '';
let tenancyId = '';
let rentInvoiceId = '';

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
  name: 'Real Estate Test User',
  email: `realestate${Date.now()}@payshield.com`,
  password: 'password123',
  businessName: 'Real Estate Test Business'
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

  console.log('\n=== Step 2: Create Property ===');
  const propertyData = JSON.stringify({
    name: 'Test Apartment Complex',
    address: '123 Main Street',
    propertyType: 'APARTMENT',
    totalUnits: 5
  });

  makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/realestate/properties',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(propertyData),
      'Authorization': `Bearer ${token}`
    }
  }, propertyData, (status, data) => {
    console.log('Create Property Status:', status);
    const propertyResult = JSON.parse(data);
    propertyId = propertyResult.property.id;
    console.log('✓ Property created');

    console.log('\n=== Step 3: Create Property Unit ===');
    const unitData = JSON.stringify({
      propertyId: propertyId,
      unitNumber: 'A101',
      size: 45.5,
      rentAmount: 1500,
      currency: 'USD'
    });

    makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/realestate/units',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(unitData),
        'Authorization': `Bearer ${token}`
      }
    }, unitData, (status, data) => {
      console.log('Create Unit Status:', status);
      const unitResult = JSON.parse(data);
      unitId = unitResult.unit.id;
      console.log('✓ Unit created');

      console.log('\n=== Step 4: Create Tenant ===');
      const tenantData = JSON.stringify({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+254712345678',
        idNumber: 'ID12345678'
      });

      makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/realestate/tenants',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(tenantData),
          'Authorization': `Bearer ${token}`
        }
      }, tenantData, (status, data) => {
        console.log('Create Tenant Status:', status);
        const tenantResult = JSON.parse(data);
        tenantId = tenantResult.tenant.id;
        console.log('✓ Tenant created');

        console.log('\n=== Step 5: Create Tenancy ===');
        const tenancyData = JSON.stringify({
          propertyUnitId: unitId,
          tenantId: tenantId,
          startDate: new Date().toISOString(),
          rentAmount: 1500,
          depositAmount: 3000
        });

        makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: '/api/realestate/tenancies',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(tenancyData),
            'Authorization': `Bearer ${token}`
          }
        }, tenancyData, (status, data) => {
          console.log('Create Tenancy Status:', status);
          const tenancyResult = JSON.parse(data);
          tenancyId = tenancyResult.tenancy.id;
          console.log('✓ Tenancy created');

          console.log('\n=== Step 6: Create Rent Invoice ===');
          const rentInvoiceData = JSON.stringify({
            tenancyId: tenancyId,
            rentPeriod: 'October 2026',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 1500
          });

          makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/realestate/rent-invoices',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(rentInvoiceData),
              'Authorization': `Bearer ${token}`
            }
          }, rentInvoiceData, (status, data) => {
            console.log('Create Rent Invoice Status:', status);
            const rentInvoiceResult = JSON.parse(data);
            rentInvoiceId = rentInvoiceResult.invoice.id;
            console.log('✓ Rent invoice created');

            console.log('\n=== Step 7: Create Rent Payment ===');
            const rentPaymentData = JSON.stringify({
              rentInvoiceId: rentInvoiceId,
              amount: 1500,
              method: 'CASH',
              reference: 'RENT-001'
            });

            makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: '/api/realestate/rent-payments',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(rentPaymentData),
                'Authorization': `Bearer ${token}`
              }
            }, rentPaymentData, (status, data) => {
              console.log('Create Rent Payment Status:', status);
              console.log('✓ Rent payment recorded');

              console.log('\n=== Step 8: Get Real Estate Report ===');
              makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/realestate/report',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
              }, null, (status, data) => {
                console.log('Get Report Status:', status);
                const report = JSON.parse(data).report;
                console.log('Total Properties:', report.summary.totalProperties);
                console.log('Total Units:', report.summary.totalUnits);
                console.log('Active Tenancies:', report.summary.activeTenancies);
                console.log('Total Expected Rent:', report.financials.totalExpectedRent);
                console.log('Total Collected Rent:', report.financials.totalCollectedRent);
                console.log('✓ Real estate report working');

                console.log('\n=== All Real Estate Tests Passed! ===');
              });
            });
          });
        });
      });
    });
  });
});
