import { Router } from 'express';
import {
  getDashboardStats,
  listAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  listEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  listCustomers,
  getCustomerById,
  updateCustomer,
  listVehicles,
  getVehicleById,
  updateVehicle,
  transferVehicleOwner,
  listServices,
  createService,
  updateService,
  toggleServiceStatus,
  listGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  listReviews,
  createReview,
  updateReview,
  toggleReviewStatus,
  deleteReview,
  getBusinessSettings,
  updateBusinessSettings,
  listAuditLogs
} from '../controllers/operationalController.js';
import {
  listJobCards,
  createJobCard,
  getJobCardById,
  updateJobCard,
  updateJobCardStatus,
  getJobCardByAppointmentId
} from '../controllers/jobCardController.js';
import {
  getEstimatesForJobCard,
  createEstimateForJobCard,
  getEstimateById,
  sendEstimate,
  reviseEstimate,
  recordEstimateDecision,
  recordNoEstimateException
} from '../controllers/estimateController.js';
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

export const operationalRouter = Router();

// Protect ALL operational routes with Authentication and allow both OWNER and SUPER_ADMIN by default
operationalRouter.use(authenticate, requireRole('OWNER', 'SUPER_ADMIN'));

// Operational Dashboard Overview
operationalRouter.get('/dashboard/stats', getDashboardStats);

// Job Card Operations (Phase 5)
operationalRouter.get('/job-cards', listJobCards);
operationalRouter.post('/job-cards', verifyCsrf, createJobCard);
operationalRouter.get('/job-cards/:id', getJobCardById);
operationalRouter.patch('/job-cards/:id', verifyCsrf, updateJobCard);
operationalRouter.patch('/job-cards/:id/status', verifyCsrf, updateJobCardStatus);

// Estimate Operations (Phase 6)
operationalRouter.get('/job-cards/:id/estimates', getEstimatesForJobCard);
operationalRouter.post('/job-cards/:id/estimates', verifyCsrf, createEstimateForJobCard);
operationalRouter.get('/estimates/:id', getEstimateById);
operationalRouter.post('/estimates/:id/send', verifyCsrf, sendEstimate);
operationalRouter.post('/estimates/:id/revise', verifyCsrf, reviseEstimate);
operationalRouter.post('/estimates/:id/decision', verifyCsrf, recordEstimateDecision);
operationalRouter.post('/estimates/:id/record-exception', verifyCsrf, recordNoEstimateException);
operationalRouter.post('/job-cards/:id/record-exception', verifyCsrf, recordNoEstimateException);

// Billing & Invoices Operations (Phase 7)
operationalRouter.get('/billing/stats', getBillingStats);
operationalRouter.get('/reports/billing-stats', getBillingStats);
operationalRouter.get('/billing/outstanding', getOutstandingDues);
operationalRouter.get('/reports/outstanding-dues', getOutstandingDues);
operationalRouter.get('/invoices', listInvoices);
operationalRouter.post('/invoices', verifyCsrf, createInvoice);
operationalRouter.get('/invoices/:id', getInvoiceById);
operationalRouter.patch('/invoices/:id', verifyCsrf, updateInvoice);
operationalRouter.post('/invoices/:id/issue', verifyCsrf, issueInvoice);
operationalRouter.post('/invoices/:id/cancel', requireRole('OWNER'), verifyCsrf, cancelInvoice);
operationalRouter.get('/invoices/:id/payments', listPaymentsForInvoice);
operationalRouter.post('/invoices/:id/payments', verifyCsrf, recordPayment);
operationalRouter.post('/payments/:id/reverse', requireRole('OWNER'), verifyCsrf, reversePayment);

// Customer Khatta / Ledger Operations (Phase 7)
operationalRouter.get('/customers/:id/ledger', getCustomerLedger);
operationalRouter.get('/customers/:id/ledger/summary', getCustomerLedgerSummary);
operationalRouter.get('/customers/:id/ledger-summary', getCustomerLedgerSummary);
operationalRouter.post('/customers/:id/ledger/adjustments', requireRole('OWNER'), verifyCsrf, recordCustomerLedgerAdjustment);
operationalRouter.post('/customers/:id/ledger-adjustments', requireRole('OWNER'), verifyCsrf, recordCustomerLedgerAdjustment);
operationalRouter.post('/customers/:id/ledger-adjustment', requireRole('OWNER'), verifyCsrf, recordCustomerLedgerAdjustment);

// Appointment Operations
operationalRouter.get('/appointments', listAppointments);
operationalRouter.get('/appointments/:id', getAppointmentById);
operationalRouter.patch('/appointments/:id/status', verifyCsrf, updateAppointmentStatus);
operationalRouter.get('/appointments/:id/job-card', getJobCardByAppointmentId);

// Customer Enquiry Operations
operationalRouter.get('/enquiries', listEnquiries);
operationalRouter.get('/enquiries/:id', getEnquiryById);
operationalRouter.patch('/enquiries/:id/status', verifyCsrf, updateEnquiryStatus);

// Customer Management Operations
operationalRouter.get('/customers', listCustomers);
operationalRouter.get('/customers/:id', getCustomerById);
operationalRouter.patch('/customers/:id', verifyCsrf, updateCustomer);

// Vehicle Management Operations
operationalRouter.get('/vehicles', listVehicles);
operationalRouter.get('/vehicles/:id', getVehicleById);
operationalRouter.patch('/vehicles/:id', verifyCsrf, updateVehicle);
operationalRouter.post('/vehicles/:id/transfer-owner', verifyCsrf, transferVehicleOwner);

// Service Management Operations
operationalRouter.get('/services', listServices);
operationalRouter.post('/services', verifyCsrf, createService);
operationalRouter.put('/services/:id', verifyCsrf, updateService);
operationalRouter.patch('/services/:id/toggle', verifyCsrf, toggleServiceStatus);

// Gallery Management Operations
operationalRouter.get('/gallery', listGallery);
operationalRouter.post('/gallery', verifyCsrf, createGalleryItem);
operationalRouter.put('/gallery/:id', verifyCsrf, updateGalleryItem);
operationalRouter.delete('/gallery/:id', verifyCsrf, deleteGalleryItem);

// Review Management Operations
operationalRouter.get('/reviews', listReviews);
operationalRouter.post('/reviews', verifyCsrf, createReview);
operationalRouter.put('/reviews/:id', verifyCsrf, updateReview);
operationalRouter.patch('/reviews/:id/toggle', verifyCsrf, toggleReviewStatus);
operationalRouter.delete('/reviews/:id', verifyCsrf, deleteReview);

// Business Settings Operations
operationalRouter.get('/settings', getBusinessSettings);
operationalRouter.put('/settings', verifyCsrf, updateBusinessSettings);

// Audit Logs Operations (Strictly OWNER Only)
operationalRouter.get('/audit-logs', requireRole('OWNER'), listAuditLogs);

export default operationalRouter;
