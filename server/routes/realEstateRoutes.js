const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
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
} = require('../controllers/realEstateController');

router.post('/properties', authenticate, createProperty);
router.get('/properties', authenticate, listProperties);
router.get('/properties/:id', authenticate, getPropertyDetail);
router.post('/units', authenticate, createUnit);
router.get('/units', authenticate, listUnits);
router.post('/tenants', authenticate, createTenant);
router.get('/tenants', authenticate, listTenants);
router.post('/tenancies', authenticate, createTenancy);
router.get('/tenancies', authenticate, listTenancies);
router.post('/rent-invoices', authenticate, createRentInvoice);
router.get('/rent-invoices', authenticate, listRentInvoices);
router.post('/rent-payments', authenticate, createRentPayment);
router.get('/rent-payments', authenticate, listRentPayments);
router.get('/report', authenticate, getReport);

module.exports = router;
