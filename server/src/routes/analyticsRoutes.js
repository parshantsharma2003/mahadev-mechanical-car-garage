import { Router } from 'express';
import {
  getAnalyticsOverview,
  getFinancialSummary,
  getRevenueReport,
  getCollectionsReport,
  getExpenseAnalytics,
  getSupplierAnalytics,
  getCustomerInsights,
  getServicePerformance,
  getWorkshopPerformance,
  getOutstandingCustomersReport,
  getOutstandingSuppliersReport,
  exportAnalyticsReportCsv
} from '../controllers/analyticsController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const analyticsRouter = Router();

// Base staff authentication middleware
const staffAuth = [authenticate, requireRole('OWNER', 'SUPER_ADMIN')];
const ownerOnly = [authenticate, requireRole('OWNER')];

// ==========================================
// 1. FINANCIAL ANALYTICS (STRICTLY OWNER ONLY)
// ==========================================
analyticsRouter.get('/overview', ...ownerOnly, getAnalyticsOverview);
analyticsRouter.get('/financial-summary', ...ownerOnly, getFinancialSummary);
analyticsRouter.get('/revenue', ...ownerOnly, getRevenueReport);
analyticsRouter.get('/collections', ...ownerOnly, getCollectionsReport);
analyticsRouter.get('/expenses', ...ownerOnly, getExpenseAnalytics);
analyticsRouter.get('/suppliers', ...ownerOnly, getSupplierAnalytics);
analyticsRouter.get('/customer-insights', ...ownerOnly, getCustomerInsights);
analyticsRouter.get('/outstanding-customers', ...ownerOnly, getOutstandingCustomersReport);
analyticsRouter.get('/outstanding-suppliers', ...ownerOnly, getOutstandingSuppliersReport);

// ==========================================
// 2. OPERATIONAL ANALYTICS (OWNER & SUPER_ADMIN)
// ==========================================
analyticsRouter.get('/service-performance', ...staffAuth, getServicePerformance);
analyticsRouter.get('/workshop-performance', ...staffAuth, getWorkshopPerformance);

// ==========================================
// 3. SECURE CSV EXPORT (ROLE CHECKED PER REPORT TYPE)
// ==========================================
analyticsRouter.get('/export', ...staffAuth, exportAnalyticsReportCsv);

export default analyticsRouter;
