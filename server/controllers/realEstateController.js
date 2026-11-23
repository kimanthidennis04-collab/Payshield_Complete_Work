const {
  createProperty: createPropertySvc,
  getProperties,
  getProperty,
  createPropertyUnit,
  getPropertyUnits,
  createTenant: createTenantSvc,
  getTenants,
  createTenancy: createTenancySvc,
  getTenancies,
  createRentInvoice: createRentInvoiceSvc,
  getRentInvoices,
  createRentPayment: createRentPaymentSvc,
  getRentPayments,
  getRealEstateReport,
} = require('../services/realEstateService');

const createProperty = async (req, res) => {
  try {
    const property = await createPropertySvc(req.user.organizationId, req.body);
    res.status(201).json({ success: true, property });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ error: error.message || 'Failed to create property' });
  }
};

const listProperties = async (req, res) => {
  try {
    const properties = await getProperties(req.user.organizationId, req.query);
    res.json({ success: true, properties });
  } catch (error) {
    console.error('List properties error:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
};

const getPropertyDetail = async (req, res) => {
  try {
    const property = await getProperty(req.user.organizationId, req.params.id);
    res.json({ success: true, property });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(404).json({ error: error.message || 'Property not found' });
  }
};

const createUnit = async (req, res) => {
  try {
    const unit = await createPropertyUnit(req.user.organizationId, req.body);
    res.status(201).json({ success: true, unit });
  } catch (error) {
    console.error('Create unit error:', error);
    res.status(500).json({ error: error.message || 'Failed to create unit' });
  }
};

const listUnits = async (req, res) => {
  try {
    const units = await getPropertyUnits(req.user.organizationId, req.query.propertyId);
    res.json({ success: true, units });
  } catch (error) {
    console.error('List units error:', error);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
};

const createTenant = async (req, res) => {
  try {
    const tenant = await createTenantSvc(req.user.organizationId, req.body);
    res.status(201).json({ success: true, tenant });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: error.message || 'Failed to create tenant' });
  }
};

const listTenants = async (req, res) => {
  try {
    const tenants = await getTenants(req.user.organizationId, req.query);
    res.json({ success: true, tenants });
  } catch (error) {
    console.error('List tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

const createTenancy = async (req, res) => {
  try {
    const tenancy = await createTenancySvc(req.user.organizationId, req.body);
    res.status(201).json({ success: true, tenancy });
  } catch (error) {
    console.error('Create tenancy error:', error);
    res.status(400).json({ error: error.message || 'Failed to create tenancy' });
  }
};

const listTenancies = async (req, res) => {
  try {
    const tenancies = await getTenancies(req.user.organizationId, req.query);
    res.json({ success: true, tenancies });
  } catch (error) {
    console.error('List tenancies error:', error);
    res.status(500).json({ error: 'Failed to fetch tenancies' });
  }
};

const createRentInvoice = async (req, res) => {
  try {
    const invoice = await createRentInvoiceSvc(req.user.organizationId, req.body);
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    console.error('Create rent invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to create rent invoice' });
  }
};

const listRentInvoices = async (req, res) => {
  try {
    const invoices = await getRentInvoices(req.user.organizationId, req.query);
    res.json({ success: true, invoices });
  } catch (error) {
    console.error('List rent invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch rent invoices' });
  }
};

const createRentPayment = async (req, res) => {
  try {
    const payment = await createRentPaymentSvc(req.user.organizationId, req.body);
    res.status(201).json({ success: true, payment });
  } catch (error) {
    console.error('Create rent payment error:', error);
    res.status(400).json({ error: error.message || 'Failed to create rent payment' });
  }
};

const listRentPayments = async (req, res) => {
  try {
    const payments = await getRentPayments(req.user.organizationId, req.query);
    res.json({ success: true, payments });
  } catch (error) {
    console.error('List rent payments error:', error);
    res.status(500).json({ error: 'Failed to fetch rent payments' });
  }
};

const getReport = async (req, res) => {
  try {
    const report = await getRealEstateReport(req.user.organizationId, req.query);
    res.json({ success: true, report });
  } catch (error) {
    console.error('Get real estate report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

module.exports = {
  createProperty,
  listProperties,
  getPropertyDetail,
  createUnit,
  listUnits,
  createTenant,
  listTenants,
  createTenancy,
  listTenancies,
  createRentInvoice,
  listRentInvoices,
  createRentPayment,
  listRentPayments,
  getReport,
};
