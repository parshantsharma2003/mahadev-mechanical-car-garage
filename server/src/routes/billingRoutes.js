import { Router } from 'express';
import {
  listInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  listPaymentsForInvoice,
  recordPayment,
  reversePayment,
  getCustomerLedger,
  getCustomerLedgerSummary,
  recordCustomerLedgerAdjustment,
  getOutstandingDues,
  getBillingStats
} from '../controllers/billingController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { verifyCsrf } from '../middleware/csrf.js';

export const billingRouter = Router();

const staffAuth = [authenticate, requireRole('OWNER', 'SUPER_ADMIN')];

// Protect specific billing prefixes with staff authentication
billingRouter.use('/billing', staffAuth);
billingRouter.use('/reports', staffAuth);
billingRouter.use('/invoices', staffAuth);
billingRouter.use('/payments', staffAuth);
billingRouter.use('/customers', staffAuth);

// Financial Analytics & Outstanding
billingRouter.get('/billing/stats', getBillingStats);
billingRouter.get('/reports/billing-stats', getBillingStats);
billingRouter.get('/billing/outstanding', getOutstandingDues);
billingRouter.get('/reports/outstanding-dues', getOutstandingDues);

// Invoice Endpoints
billingRouter.get('/invoices', listInvoices);
billingRouter.post('/invoices', verifyCsrf, createInvoice);
billingRouter.get('/invoices/:id', getInvoiceById);
billingRouter.patch('/invoices/:id', verifyCsrf, updateInvoice);
billingRouter.post('/invoices/:id/issue', verifyCsrf, issueInvoice);
billingRouter.post('/invoices/:id/cancel', requireRole('OWNER'), verifyCsrf, cancelInvoice);

// Payment Endpoints
billingRouter.get('/invoices/:id/payments', listPaymentsForInvoice);
billingRouter.post('/invoices/:id/payments', verifyCsrf, recordPayment);
billingRouter.post('/payments/:id/reverse', requireRole('OWNER'), verifyCsrf, reversePayment);

// Customer Khatta / Ledger Endpoints
billingRouter.get('/customers/:id/ledger', getCustomerLedger);
billingRouter.get('/customers/:id/ledger/summary', getCustomerLedgerSummary);
billingRouter.get('/customers/:id/ledger-summary', getCustomerLedgerSummary);
billingRouter.post('/customers/:id/ledger/adjustments', requireRole('OWNER'), verifyCsrf, recordCustomerLedgerAdjustment);
billingRouter.post('/customers/:id/ledger-adjustments', requireRole('OWNER'), verifyCsrf, recordCustomerLedgerAdjustment);
billingRouter.post('/customers/:id/ledger-adjustment', requireRole('OWNER'), verifyCsrf, recordCustomerLedgerAdjustment);

export default billingRouter;
