import { Router } from 'express';
import {
  listSuppliers,
  createSupplier,
  getSupplierById,
  updateSupplier,
  toggleSupplierStatus,
  listSupplierPurchases,
  createSupplierPurchase,
  getSupplierPurchaseById,
  recordDraftPurchase,
  cancelSupplierPurchase,
  listSupplierPayments,
  recordSupplierPayment,
  reverseSupplierPayment,
  getSupplierLedger,
  getSupplierLedgerSummary,
  recordSupplierLedgerAdjustment
} from '../controllers/supplierController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { verifyCsrf } from '../middleware/csrf.js';

export const supplierRouter = Router();

const staffAuth = [authenticate, requireRole('OWNER', 'SUPER_ADMIN')];

// Scope authentication to supplier-related prefixes
supplierRouter.use('/suppliers', staffAuth);
supplierRouter.use('/supplier-purchases', staffAuth);
supplierRouter.use('/supplier-payments', staffAuth);

// ==========================================
// 1. SUPPLIERS DIRECTORY
// ==========================================
supplierRouter.get('/suppliers', listSuppliers);
supplierRouter.post('/suppliers', verifyCsrf, createSupplier);
supplierRouter.get('/suppliers/:id', getSupplierById);
supplierRouter.patch('/suppliers/:id', verifyCsrf, updateSupplier);
supplierRouter.patch('/suppliers/:id/status', verifyCsrf, toggleSupplierStatus);

// ==========================================
// 2. SUPPLIER PURCHASES
// ==========================================
supplierRouter.get('/supplier-purchases', listSupplierPurchases);
supplierRouter.post('/supplier-purchases', verifyCsrf, createSupplierPurchase);
supplierRouter.get('/supplier-purchases/:id', getSupplierPurchaseById);
supplierRouter.post('/supplier-purchases/:id/record', verifyCsrf, recordDraftPurchase);
supplierRouter.post('/supplier-purchases/:id/cancel', requireRole('OWNER'), verifyCsrf, cancelSupplierPurchase);

// ==========================================
// 3. SUPPLIER PAYMENTS
// ==========================================
supplierRouter.get('/suppliers/:id/payments', listSupplierPayments);
supplierRouter.post('/suppliers/:id/payments', verifyCsrf, recordSupplierPayment);
supplierRouter.post('/supplier-payments/:id/reverse', requireRole('OWNER'), verifyCsrf, reverseSupplierPayment);

// ==========================================
// 4. DIGITAL SUPPLIER KHATTA (LEDGER)
// ==========================================
supplierRouter.get('/suppliers/:id/ledger', getSupplierLedger);
supplierRouter.get('/suppliers/:id/ledger/summary', getSupplierLedgerSummary);
supplierRouter.get('/suppliers/:id/ledger-summary', getSupplierLedgerSummary);
supplierRouter.post(
  '/suppliers/:id/ledger/adjustments',
  requireRole('OWNER'),
  verifyCsrf,
  recordSupplierLedgerAdjustment
);
supplierRouter.post(
  '/suppliers/:id/ledger-adjustments',
  requireRole('OWNER'),
  verifyCsrf,
  recordSupplierLedgerAdjustment
);

export default supplierRouter;
