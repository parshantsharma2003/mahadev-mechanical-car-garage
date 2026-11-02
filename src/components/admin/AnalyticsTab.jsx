import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Receipt,
  Truck,
  Users,
  Wrench,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert
} from 'lucide-react';
import {
  fetchAnalyticsOverview,
  fetchFinancialSummary,
  fetchRevenueReport,
  fetchCollectionsReport,
  fetchExpenseAnalytics,
  fetchSupplierAnalytics,
  fetchCustomerInsights,
  fetchServicePerformance,
  fetchWorkshopPerformance,
  fetchOutstandingCustomers,
  fetchOutstandingSuppliers,
  downloadAnalyticsReportCsv
} from '../../utils/api';
import './AnalyticsTab.css';

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom' }
];

export default function AnalyticsTab({ isOwner }) {
  // Navigation: SUPER_ADMIN defaults to workshop operational view
  const [activeSubtab, setActiveSubtab] = useState(isOwner ? 'overview' : 'workshop');
  const [preset, setPreset] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Loaded Data
  const [overview, setOverview] = useState(null);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [collectionsData, setCollectionsData] = useState(null);
  const [expensesData, setExpensesData] = useState(null);
  const [suppliersData, setSuppliersData] = useState(null);
  const [customersData, setCustomersData] = useState(null);
  const [servicesData, setServicesData] = useState(null);
  const [workshopData, setWorkshopData] = useState(null);
  const [outstandingCustData, setOutstandingCustData] = useState(null);
  const [outstandingSuppData, setOutstandingSuppData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  // Currency Formatter
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(val) || 0);
  };

  // Build filter query params
  const getFilterParams = () => {
    if (preset === 'custom') {
      return { preset: 'custom', dateFrom: customFrom, dateTo: customTo };
    }
    return { preset };
  };

  // Fetch data depending on active tab & role
  const loadData = async () => {
    setLoading(true);
    setError('');
    const params = getFilterParams();

    try {
      if (isOwner) {
        if (activeSubtab === 'overview') {
          const [ov, fin] = await Promise.all([
            fetchAnalyticsOverview(params),
            fetchFinancialSummary(params)
          ]);
          setOverview(ov);
          setFinancialSummary(fin);
        } else if (activeSubtab === 'financial') {
          const [rev, col, dues] = await Promise.all([
            fetchRevenueReport({ ...params, limit: 50 }),
            fetchCollectionsReport({ ...params, limit: 50 }),
            fetchOutstandingCustomers({ ...params, limit: 50 })
          ]);
          setRevenueData(rev);
          setCollectionsData(col);
          setOutstandingCustData(dues);
        } else if (activeSubtab === 'expenses') {
          const exp = await fetchExpenseAnalytics(params);
          setExpensesData(exp);
        } else if (activeSubtab === 'suppliers') {
          const [supp, dues] = await Promise.all([
            fetchSupplierAnalytics(params),
            fetchOutstandingSuppliers({ ...params, limit: 50 })
          ]);
          setSuppliersData(supp);
          setOutstandingSuppData(dues);
        } else if (activeSubtab === 'customers') {
          const cust = await fetchCustomerInsights(params);
          setCustomersData(cust);
        }
      }

      // Operational views accessible to both OWNER & SUPER_ADMIN
      if (activeSubtab === 'services') {
        const serv = await fetchServicePerformance(params);
        setServicesData(serv);
      } else if (activeSubtab === 'workshop') {
        const ws = await fetchWorkshopPerformance(params);
        setWorkshopData(ws);
      }
    } catch (err) {
      console.error('[Analytics Error]:', err);
      setError(err.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSubtab, preset]);

  const handleApplyCustom = () => {
    if (!customFrom || !customTo) {
      setError('Please provide both Start and End dates for custom range.');
      return;
    }
    if (new Date(customFrom) > new Date(customTo)) {
      setError('Start date cannot be after End date.');
      return;
    }
    setError('');
    loadData();
  };

  const handleExportCsv = async (type) => {
    try {
      setExporting(true);
      await downloadAnalyticsReportCsv(type, getFilterParams());
    } catch (err) {
      alert(`Failed to export CSV: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Subtab Permissions Guard
  const isFinancialTab = ['overview', 'financial', 'expenses', 'suppliers', 'customers'].includes(activeSubtab);
  if (!isOwner && isFinancialTab) {
    return (
      <div className="analytics-tab-container">
        <div className="admin-content-card empty-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <ShieldAlert size={48} className="text-red-500" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#F8FAFC' }}>
            Financial Analytics Restricted
          </h3>
          <p style={{ color: '#94A3B8', maxWidth: '520px', margin: '0.5rem auto 1.5rem', lineHeight: 1.6 }}>
            In accordance with garage security governance, financial metrics, revenue, expense ledgers, and cash flow reports are strictly restricted to the <strong>OWNER</strong> role.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => setActiveSubtab('workshop')}
            >
              <Wrench size={16} />
              <span>View Workshop Operations</span>
            </button>
            <button
              className="btn btn-outline-dark"
              onClick={() => setActiveSubtab('services')}
            >
              <BarChart3 size={16} />
              <span>View Service Performance</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-tab-container">
      {/* ---------------- DATE FILTER TOOLBAR ---------------- */}
      <div className="analytics-filter-toolbar no-print">
        <div className="preset-filter-group">
          <Calendar size={18} style={{ color: '#94A3B8', marginRight: '0.25rem' }} />
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`preset-btn ${preset === p.id ? 'active' : ''}`}
              onClick={() => {
                setPreset(p.id);
                if (p.id !== 'custom') {
                  setCustomFrom('');
                  setCustomTo('');
                }
              }}
            >
              {p.label}
            </button>
          ))}

          {preset === 'custom' && (
            <div className="custom-range-picker">
              <input
                type="date"
                className="custom-date-input"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                placeholder="From"
              />
              <span className="range-separator">to</span>
              <input
                type="date"
                className="custom-date-input"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                placeholder="To"
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleApplyCustom}
                style={{ padding: '0.35rem 0.65rem' }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="filter-actions">
          {overview?.dateRange && (
            <span className="resolved-range-badge">
              {new Date(overview.dateRange.start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' — '}
              {new Date(overview.dateRange.end).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}

          <button
            className="btn btn-outline-dark btn-sm"
            onClick={loadData}
            disabled={loading}
            title="Refresh analytics data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            className="btn btn-outline-dark btn-sm"
            onClick={() => window.print()}
            title="Print A4 Executive Report"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ---------------- SUB-NAVIGATION TABS ---------------- */}
      <div className="analytics-subnav no-print">
        {isOwner && (
          <>
            <button
              className={`analytics-subnav-btn ${activeSubtab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSubtab('overview')}
            >
              <TrendingUp size={16} />
              <span>Overview</span>
            </button>
            <button
              className={`analytics-subnav-btn ${activeSubtab === 'financial' ? 'active' : ''}`}
              onClick={() => setActiveSubtab('financial')}
            >
              <Receipt size={16} />
              <span>Financial Reports</span>
            </button>
            <button
              className={`analytics-subnav-btn ${activeSubtab === 'expenses' ? 'active' : ''}`}
              onClick={() => setActiveSubtab('expenses')}
            >
              <DollarSign size={16} />
              <span>Expenses</span>
            </button>
            <button
              className={`analytics-subnav-btn ${activeSubtab === 'suppliers' ? 'active' : ''}`}
              onClick={() => setActiveSubtab('suppliers')}
            >
              <Truck size={16} />
              <span>Supplier Reports</span>
            </button>
            <button
              className={`analytics-subnav-btn ${activeSubtab === 'customers' ? 'active' : ''}`}
              onClick={() => setActiveSubtab('customers')}
            >
              <Users size={16} />
              <span>Customer Insights</span>
            </button>
          </>
        )}
        <button
          className={`analytics-subnav-btn ${activeSubtab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('services')}
        >
          <BarChart3 size={16} />
          <span>Service Performance</span>
        </button>
        <button
          className={`analytics-subnav-btn ${activeSubtab === 'workshop' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('workshop')}
        >
          <Wrench size={16} />
          <span>Workshop Performance</span>
        </button>
      </div>

      {/* ---------------- ERROR ALERT ---------------- */}
      {error && (
        <div className="tab-error-state" style={{ margin: '0' }}>
          <AlertCircle size={20} className="text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* ---------------- LOADING STATE ---------------- */}
      {loading && (
        <div className="tab-loading-state" style={{ padding: '4rem 1rem' }}>
          <div className="loading-spinner" />
          <p>Calculating live garage aggregates from MongoDB...</p>
        </div>
      )}

      {/* =========================================================================
         TAB 1: OVERVIEW (EXECUTIVE DASHBOARD)
         ========================================================================= */}
      {!loading && activeSubtab === 'overview' && overview && (
        <>
          {/* Methodology Disclosure Accordion */}
          <div className="methodology-banner">
            <div className="methodology-header" onClick={() => setShowMethodology(!showMethodology)}>
              <span className="methodology-title">
                <Info size={18} style={{ color: '#60A5FA' }} />
                Financial Methodology & Operating Cash Movement Disclosure
              </span>
              <button
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                aria-label="Toggle Methodology Details"
              >
                {showMethodology ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
            {showMethodology && (
              <div className="methodology-details">
                <p>
                  {overview.cashFlowMethodology?.note ||
                    'Estimated Operating Cash Movement indicates cash collected minus actual cash outflows (recorded operating expenses and supplier disbursements).'}
                </p>
                <div className="methodology-grid">
                  <div className="methodology-item">
                    <strong>Included in Cash Flow Inflows</strong>
                    <span>Valid completed customer payments received in the period (adjusted for reversals).</span>
                  </div>
                  <div className="methodology-item">
                    <strong>Included in Cash Flow Outflows</strong>
                    <span>Cash operating expenses recorded + actual supplier payment disbursements made.</span>
                  </div>
                  <div className="methodology-item">
                    <strong>Excluded from Cash Flow (Balance Sheet)</strong>
                    <span>Credit purchases (until paid), customer unpaid dues, depreciation, and tax liabilities.</span>
                  </div>
                  <div className="methodology-item">
                    <strong>Accounting Net Profit Distinction</strong>
                    <span>Not claimed as true accounting net profit since COGS and inventory usage are not tracked.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Revenue & Collections KPI Grid */}
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Billed Invoiced Value</span>
                <div className="kpi-icon-pill blue">
                  <Receipt size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{formatINR(overview.revenue?.totalInvoiced)}</span>
              <span className="kpi-sub-text">
                {overview.revenue?.invoicesIssuedCount || 0} issued invoices (excludes drafts/cancelled)
              </span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Actual Cash Collected</span>
                <div className="kpi-icon-pill green">
                  <DollarSign size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{formatINR(overview.revenue?.totalCashCollected)}</span>
              <span className="kpi-sub-text">
                {overview.revenue?.completedPaymentsCount || 0} completed payments (reversals deducted)
              </span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Operating Expenses</span>
                <div className="kpi-icon-pill red">
                  <TrendingUp size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{formatINR(overview.expenses?.totalExpenses)}</span>
              <span className="kpi-sub-text">
                {overview.expenses?.expenseCount || 0} recorded vouchers • Top: {overview.expenses?.highestCategory?.category || 'None'}
              </span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Operating Cash Movement</span>
                <div className={`kpi-icon-pill ${overview.cashFlowMethodology?.operatingCashMovement >= 0 ? 'green' : 'amber'}`}>
                  {overview.cashFlowMethodology?.operatingCashMovement >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                </div>
              </div>
              <span className="kpi-main-val" style={{ color: overview.cashFlowMethodology?.operatingCashMovement >= 0 ? '#34D399' : '#FBBF24' }}>
                {formatINR(overview.cashFlowMethodology?.operatingCashMovement)}
              </span>
              <span className="kpi-sub-text">
                Cash Collected − (Expenses + Supplier Payments)
              </span>
            </div>
          </div>

          {/* Balance Sheet Dues Grid */}
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Customer Receivables</span>
                <div className="kpi-icon-pill amber">
                  <Users size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{formatINR(overview.customerFinancials?.totalCustomerOutstanding)}</span>
              <span className="kpi-sub-text">
                {overview.customerFinancials?.customersWithOutstandingCount || 0} customers with unpaid balances
              </span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Supplier Payables</span>
                <div className="kpi-icon-pill purple">
                  <Truck size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{formatINR(overview.suppliers?.outstandingPayable)}</span>
              <span className="kpi-sub-text">
                Garage owes suppliers for recorded purchases
              </span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Supplier Purchases</span>
                <div className="kpi-icon-pill blue">
                  <Truck size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{formatINR(overview.suppliers?.totalPurchases)}</span>
              <span className="kpi-sub-text">
                Disbursements made: {formatINR(overview.suppliers?.totalPaymentsDisbursed)}
              </span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Workshop Turnaround</span>
                <div className="kpi-icon-pill green">
                  <Clock size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{overview.workshop?.avgCompletionTimeHours || 0} hrs</span>
              <span className="kpi-sub-text">
                {overview.workshop?.completedJobCards || 0} completed jobs • {overview.workshop?.activeJobCardsInProgress || 0} in bays
              </span>
            </div>
          </div>

          {/* Historical Financial Trend Chart */}
          {financialSummary?.monthlyTrends && financialSummary.monthlyTrends.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <h4 className="chart-card-title">Monthly Billed Invoices vs. Cash Collections</h4>
                  <p className="chart-card-subtitle">
                    Tracking billing volume against actual realized cash receipts over recent months
                  </p>
                </div>
                <div className="chart-legend">
                  <span className="legend-item">
                    <span className="legend-dot" style={{ background: '#3B82F6' }} />
                    Billed Invoiced Value
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot" style={{ background: '#10B981' }} />
                    Cash Collected
                  </span>
                </div>
              </div>

              {/* Native Responsive Dual Bar SVG */}
              <div className="svg-chart-wrapper">
                {(() => {
                  const trends = financialSummary.monthlyTrends;
                  const maxVal = Math.max(
                    ...trends.map((t) => Math.max(t.invoicedValue, t.cashCollected)),
                    1000
                  );
                  const barGroupWidth = 100 / trends.length;

                  return (
                    <svg viewBox="0 0 1000 220" preserveAspectRatio="none">
                      {/* Gridlines */}
                      <line x1="0" y1="40" x2="1000" y2="40" stroke="#1E293B" strokeDasharray="4" />
                      <line x1="0" y1="100" x2="1000" y2="100" stroke="#1E293B" strokeDasharray="4" />
                      <line x1="0" y1="160" x2="1000" y2="160" stroke="#1E293B" strokeDasharray="4" />

                      {trends.map((t, idx) => {
                        const groupX = (idx / trends.length) * 920 + 40;
                        const invHeight = Math.min(150, (t.invoicedValue / maxVal) * 150);
                        const colHeight = Math.min(150, (t.cashCollected / maxVal) * 150);

                        return (
                          <g key={t.monthKey}>
                            {/* Invoiced Bar */}
                            <rect
                              x={groupX}
                              y={170 - invHeight}
                              width="24"
                              height={invHeight}
                              fill="#3B82F6"
                              rx="3"
                            />
                            {/* Collected Bar */}
                            <rect
                              x={groupX + 28}
                              y={170 - colHeight}
                              width="24"
                              height={colHeight}
                              fill="#10B981"
                              rx="3"
                            />
                            {/* Month Label */}
                            <text
                              x={groupX + 26}
                              y="195"
                              fill="#94A3B8"
                              fontSize="12"
                              textAnchor="middle"
                            >
                              {t.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Dual Category & Pipeline Breakdown */}
          <div className="charts-dual-grid">
            {/* Expense Categories Breakdown */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <h4 className="chart-card-title">Expense Category Breakdown</h4>
                  <p className="chart-card-subtitle">Overhead distribution for the selected period</p>
                </div>
              </div>
              <div className="horizontal-ranking-list">
                {overview.expenses?.categoryBreakdown && overview.expenses.categoryBreakdown.length > 0 ? (
                  overview.expenses.categoryBreakdown.map((cat, idx) => {
                    const totalExp = overview.expenses.totalExpenses || 1;
                    const pct = Math.round((cat.totalAmount / totalExp) * 100);
                    return (
                      <div key={cat.category} className="ranking-item">
                        <div className="ranking-meta">
                          <span className="ranking-name">{cat.category.replace(/_/g, ' ')}</span>
                          <span className="ranking-value">
                            {formatINR(cat.totalAmount)} ({pct}%)
                          </span>
                        </div>
                        <div className="ranking-bar-track">
                          <div
                            className={`ranking-bar-fill ${idx % 2 === 0 ? 'red' : 'amber'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: '#64748B', fontSize: '0.85rem' }}>No expenses recorded in this period.</p>
                )}
              </div>
            </div>

            {/* Job Card Operational Pipeline */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <h4 className="chart-card-title">Workshop Job Card Pipeline</h4>
                  <p className="chart-card-subtitle">Active vehicles in workshop stages</p>
                </div>
              </div>
              <div className="pipeline-track">
                {overview.workshop?.statusDistribution ? (
                  Object.entries(overview.workshop.statusDistribution).map(([st, cnt]) => (
                    <div key={st} className="pipeline-stage">
                      <span className="pipeline-stage-name">{st.replace(/_/g, ' ')}</span>
                      <div className="pipeline-stage-count">{cnt}</div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#64748B', fontSize: '0.85rem' }}>No active job cards.</p>
                )}
              </div>
              <div style={{ marginTop: '1rem', borderTop: '1px solid #1E293B', paddingTop: '0.75rem', fontSize: '0.82rem', color: '#94A3B8' }}>
                Conversion Rate: <strong>{overview.workshop?.appointmentConversionRate || 0}%</strong> of appointments converted into completed Job Cards.
              </div>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
         TAB 2: FINANCIAL REPORTS (REVENUE, COLLECTIONS, CUSTOMER OUTSTANDING)
         ========================================================================= */}
      {!loading && activeSubtab === 'financial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Revenue Billed Invoices Table */}
          <div className="analytics-table-card">
            <div className="table-header-row">
              <div className="table-title-group">
                <h3>Issued Revenue Invoices</h3>
                <p>Non-draft, non-cancelled invoices issued within the period</p>
              </div>
              <button
                className="btn btn-outline-dark btn-sm"
                onClick={() => handleExportCsv('revenue')}
                disabled={exporting}
              >
                <FileSpreadsheet size={15} />
                <span>Export Revenue CSV</span>
              </button>
            </div>

            <div className="table-responsive-wrapper">
              <table className="analytics-data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Issue Date</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Total (INR)</th>
                    <th style={{ textAlign: 'right' }}>Paid (INR)</th>
                    <th style={{ textAlign: 'right' }}>Due (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData?.invoices && revenueData.invoices.length > 0 ? (
                    revenueData.invoices.map((inv) => (
                      <tr key={inv._id}>
                        <td style={{ fontWeight: 600, color: '#38BDF8' }}>{inv.invoiceNumber}</td>
                        <td>{new Date(inv.issueDate).toLocaleDateString('en-IN')}</td>
                        <td>{inv.customerSnapshot?.fullName || inv.customerId?.fullName || '—'}</td>
                        <td>{inv.vehicleSnapshot?.registrationNumber || '—'}</td>
                        <td>
                          <span className={`aging-pill ${inv.paymentStatus === 'PAID' ? 'green' : inv.paymentStatus === 'PARTIALLY_PAID' ? 'amber' : 'red'}`}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(inv.grandTotal)}</td>
                        <td style={{ textAlign: 'right', color: '#34D399' }}>{formatINR(inv.amountPaid)}</td>
                        <td style={{ textAlign: 'right', color: inv.balanceDue > 0 ? '#F87171' : '#94A3B8' }}>
                          {formatINR(inv.balanceDue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#64748B', padding: '2rem' }}>
                        No invoices issued for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Collection Receipts Table */}
          <div className="analytics-table-card">
            <div className="table-header-row">
              <div className="table-title-group">
                <h3>Customer Payment Receipts (Cash Inflows)</h3>
                <p>Completed payments realized in the bank or cash drawer</p>
              </div>
              <button
                className="btn btn-outline-dark btn-sm"
                onClick={() => handleExportCsv('collections')}
                disabled={exporting}
              >
                <FileSpreadsheet size={15} />
                <span>Export Collections CSV</span>
              </button>
            </div>

            <div className="table-responsive-wrapper">
              <table className="analytics-data-table">
                <thead>
                  <tr>
                    <th>Receipt Ref</th>
                    <th>Payment Date</th>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Payment Method</th>
                    <th>Txn / UTR</th>
                    <th style={{ textAlign: 'right' }}>Amount Received</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionsData?.payments && collectionsData.payments.length > 0 ? (
                    collectionsData.payments.map((p) => (
                      <tr key={p._id}>
                        <td style={{ fontWeight: 600, color: '#34D399' }}>{p.paymentReference}</td>
                        <td>{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                        <td>{p.invoiceId?.invoiceNumber || 'DIRECT'}</td>
                        <td>{p.customerId?.fullName || '—'}</td>
                        <td>{p.paymentMethod}</td>
                        <td style={{ color: '#94A3B8', fontSize: '0.8rem' }}>{p.transactionReference || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#34D399' }}>
                          {formatINR(p.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: '#64748B', padding: '2rem' }}>
                        No payments collected for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Aging Outstanding Report */}
          <div className="analytics-table-card">
            <div className="table-header-row">
              <div className="table-title-group">
                <h3>Customer Aging Outstanding Balances</h3>
                <p>Breakdown of customers with unpaid dues sorted by highest outstanding</p>
              </div>
              <button
                className="btn btn-outline-dark btn-sm"
                onClick={() => handleExportCsv('outstanding-customers')}
                disabled={exporting}
              >
                <FileSpreadsheet size={15} />
                <span>Export Outstanding CSV</span>
              </button>
            </div>

            <div className="table-responsive-wrapper">
              <table className="analytics-data-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Invoice #</th>
                    <th>Invoice Date</th>
                    <th>Aging</th>
                    <th style={{ textAlign: 'right' }}>Billed</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingCustData?.outstandingInvoices && outstandingCustData.outstandingInvoices.length > 0 ? (
                    outstandingCustData.outstandingInvoices.map((inv) => (
                      <tr key={inv._id}>
                        <td style={{ fontWeight: 600 }}>{inv.customer?.fullName || '—'}</td>
                        <td>{inv.customer?.mobileNumber || '—'}</td>
                        <td style={{ color: '#38BDF8' }}>{inv.invoiceNumber}</td>
                        <td>{new Date(inv.issueDate).toLocaleDateString('en-IN')}</td>
                        <td>
                          <span
                            className={`aging-pill ${
                              inv.daysOutstanding > 60 ? 'red' : inv.daysOutstanding > 30 ? 'orange' : 'amber'
                            }`}
                          >
                            {inv.daysOutstanding} days
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatINR(inv.grandTotal)}</td>
                        <td style={{ textAlign: 'right', color: '#34D399' }}>{formatINR(inv.amountPaid)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#F87171' }}>
                          {formatINR(inv.balanceDue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#64748B', padding: '2rem' }}>
                        No customers have outstanding balances.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 3: EXPENSES (CATEGORY TOTALS & DAILY TREND)
         ========================================================================= */}
      {!loading && activeSubtab === 'expenses' && expensesData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Total Recorded Overheads</span>
                <div className="kpi-icon-pill red">
                  <DollarSign size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{formatINR(expensesData.summary?.totalAmount)}</span>
              <span className="kpi-sub-text">{expensesData.summary?.totalCount || 0} valid vouchers recorded</span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Average Daily Spend</span>
                <div className="kpi-icon-pill amber">
                  <Calendar size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{formatINR(expensesData.summary?.avgDailyExpense)}</span>
              <span className="kpi-sub-text">Calculated across selected period days</span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Highest Spend Category</span>
                <div className="kpi-icon-pill purple">
                  <TrendingUp size={18} />
                </div>
              </div>
              <span className="kpi-main-val" style={{ fontSize: '1.25rem' }}>
                {expensesData.summary?.highestCategory?.category?.replace(/_/g, ' ') || 'None'}
              </span>
              <span className="kpi-sub-text">
                {formatINR(expensesData.summary?.highestCategory?.totalAmount || 0)}
              </span>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="analytics-table-card">
            <div className="table-header-row">
              <div className="table-title-group">
                <h3>Category-Wise Expense Breakdown</h3>
                <p>Operational expenditures categorized for budgeting and auditing</p>
              </div>
              <button
                className="btn btn-outline-dark btn-sm"
                onClick={() => handleExportCsv('expenses')}
                disabled={exporting}
              >
                <FileSpreadsheet size={15} />
                <span>Export Expenses CSV</span>
              </button>
            </div>

            <div className="table-responsive-wrapper">
              <table className="analytics-data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Vouchers Count</th>
                    <th style={{ textAlign: 'right' }}>Total Amount (INR)</th>
                    <th style={{ textAlign: 'right' }}>Percentage of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesData.categoryBreakdown && expensesData.categoryBreakdown.length > 0 ? (
                    expensesData.categoryBreakdown.map((c) => (
                      <tr key={c.category}>
                        <td style={{ fontWeight: 600 }}>{c.category.replace(/_/g, ' ')}</td>
                        <td>{c.count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(c.totalAmount)}</td>
                        <td style={{ textAlign: 'right', color: '#60A5FA' }}>{c.percentage}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#64748B', padding: '2rem' }}>
                        No expense records in this timeframe.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 4: SUPPLIER REPORTS (PURCHASES VS PAYMENTS & PAYABLES)
         ========================================================================= */}
      {!loading && activeSubtab === 'suppliers' && suppliersData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Material Purchases</span>
                <div className="kpi-icon-pill blue">
                  <Truck size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{formatINR(suppliersData.summary?.totalPurchases)}</span>
              <span className="kpi-sub-text">
                {suppliersData.summary?.purchaseCount || 0} purchase orders in period
              </span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Disbursed Payments</span>
                <div className="kpi-icon-pill green">
                  <DollarSign size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{formatINR(suppliersData.summary?.totalPaymentsDisbursed)}</span>
              <span className="kpi-sub-text">
                Actual cash disbursements to vendors
              </span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Outstanding Payables</span>
                <div className="kpi-icon-pill amber">
                  <Receipt size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{formatINR(suppliersData.summary?.outstandingPayable)}</span>
              <span className="kpi-sub-text">
                Cumulative money owed to vendors
              </span>
            </div>
          </div>

          {/* Top Suppliers Table */}
          <div className="analytics-table-card">
            <div className="table-header-row">
              <div className="table-title-group">
                <h3>Top Suppliers by Purchase Volume</h3>
                <p>Material vendors by total invoice value during the selected range</p>
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table className="analytics-data-table">
                <thead>
                  <tr>
                    <th>Supplier Name</th>
                    <th>Orders</th>
                    <th style={{ textAlign: 'right' }}>Total Purchases</th>
                    <th style={{ textAlign: 'right' }}>Total Paid</th>
                    <th style={{ textAlign: 'right' }}>Outstanding Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliersData.topSuppliers && suppliersData.topSuppliers.length > 0 ? (
                    suppliersData.topSuppliers.map((s) => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 600 }}>{s.supplierName}</td>
                        <td>{s.purchaseCount}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(s.totalPurchases)}</td>
                        <td style={{ textAlign: 'right', color: '#34D399' }}>{formatINR(s.totalPaid)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: s.totalPayable > 0 ? '#F87171' : '#94A3B8' }}>
                          {formatINR(s.totalPayable)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: '#64748B', padding: '2rem' }}>
                        No supplier purchases in this timeframe.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 5: CUSTOMER INSIGHTS (RETENTION, LIFETIME VALUE & FREQUENCY)
         ========================================================================= */}
      {!loading && activeSubtab === 'customers' && customersData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Registered Customers</span>
                <div className="kpi-icon-pill blue">
                  <Users size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{customersData.summary?.totalRegistered || 0}</span>
              <span className="kpi-sub-text">
                +{customersData.summary?.newCustomersInPeriod || 0} new customers in this period
              </span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Returning Clients</span>
                <div className="kpi-icon-pill green">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{customersData.summary?.returningCustomersInPeriod || 0}</span>
              <span className="kpi-sub-text">Customers with &gt;1 lifetime service visit</span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Repeat Service Rate</span>
                <div className="kpi-icon-pill amber">
                  <TrendingUp size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{customersData.summary?.repeatServiceRate || 0}%</span>
              <span className="kpi-sub-text">
                Clients returning for recurring maintenance
              </span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Average Invoice Ticket</span>
                <div className="kpi-icon-pill purple">
                  <Receipt size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{formatINR(customersData.summary?.avgInvoiceValue)}</span>
              <span className="kpi-sub-text">Average billing spend per job</span>
            </div>
          </div>

          {/* Top Customers Table */}
          <div className="analytics-table-card">
            <div className="table-header-row">
              <div className="table-title-group">
                <h3>Top Valued Customers (Lifetime Spend)</h3>
                <p>Clients generating the highest billed value across their visit history</p>
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table className="analytics-data-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Lifetime Invoices</th>
                    <th style={{ textAlign: 'right' }}>Lifetime Billed</th>
                    <th style={{ textAlign: 'right' }}>Total Paid</th>
                    <th style={{ textAlign: 'right' }}>Current Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {customersData.topCustomers && customersData.topCustomers.length > 0 ? (
                    customersData.topCustomers.map((c) => (
                      <tr key={c._id}>
                        <td style={{ fontWeight: 600 }}>{c.fullName}</td>
                        <td>{c.mobileNumber}</td>
                        <td>{c.invoiceCount}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#60A5FA' }}>
                          {formatINR(c.totalBilled)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#34D399' }}>{formatINR(c.totalPaid)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: c.outstandingDue > 0 ? '#F87171' : '#94A3B8' }}>
                          {formatINR(c.outstandingDue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: '#64748B', padding: '2rem' }}>
                        No customer invoicing history available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 6: SERVICE PERFORMANCE (POPULARITY, REVENUE, CATEGORIES)
         ========================================================================= */}
      {!loading && activeSubtab === 'services' && servicesData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <h4 className="chart-card-title">Top Revenue-Generating Services & Parts</h4>
                <p className="chart-card-subtitle">
                  Aggregated from issued invoice line items (excluding draft estimates)
                </p>
              </div>
            </div>

            <div className="horizontal-ranking-list">
              {servicesData.topBilledServices && servicesData.topBilledServices.length > 0 ? (
                servicesData.topBilledServices.map((s, idx) => {
                  const maxBilled = servicesData.topBilledServices[0]?.totalBilled || 1;
                  const pct = Math.round((s.totalBilled / maxBilled) * 100);

                  return (
                    <div key={s._id} className="ranking-item">
                      <div className="ranking-meta">
                        <span className="ranking-name">
                          {s.itemName}{' '}
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>({s.itemType})</span>
                        </span>
                        <span className="ranking-value">
                          {formatINR(s.totalBilled)} • {s.totalQtySold} billed
                        </span>
                      </div>
                      <div className="ranking-bar-track">
                        <div
                          className={`ranking-bar-fill ${idx % 2 === 0 ? 'blue' : 'green'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                  No completed service invoice records found for this period.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 7: WORKSHOP PERFORMANCE (JOB CARDS, PIPELINE, TURNAROUND)
         ========================================================================= */}
      {!loading && activeSubtab === 'workshop' && workshopData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Total Job Cards</span>
                <div className="kpi-icon-pill blue">
                  <Wrench size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{workshopData.summary?.totalJobCards || 0}</span>
              <span className="kpi-sub-text">Vehicles taken into service bays</span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Completed & Delivered</span>
                <div className="kpi-icon-pill green">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{workshopData.summary?.completedCount || 0}</span>
              <span className="kpi-sub-text">Finished and handed over to clients</span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Average Bay Turnaround</span>
                <div className="kpi-icon-pill amber">
                  <Clock size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{workshopData.summary?.avgCompletionHours || 0} hrs</span>
              <span className="kpi-sub-text">From Job Card creation to completion</span>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-title-text">Appointment Conversion</span>
                <div className="kpi-icon-pill purple">
                  <TrendingUp size={18} />
                </div>
              </div>
              <span className="kpi-main-val">{workshopData.summary?.conversionRate || 0}%</span>
              <span className="kpi-sub-text">Bookings converted into Job Cards</span>
            </div>
          </div>

          {/* Workshop Stage Distribution */}
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <h4 className="chart-card-title">Live Floor Status Breakdown</h4>
                <p className="chart-card-subtitle">Active distribution of vehicles across workshop bays</p>
              </div>
            </div>

            <div className="pipeline-track">
              {workshopData.statusDistribution ? (
                Object.entries(workshopData.statusDistribution).map(([status, count]) => (
                  <div key={status} className="pipeline-stage">
                    <span className="pipeline-stage-name">{status.replace(/_/g, ' ')}</span>
                    <div className="pipeline-stage-count">{count}</div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#64748B', fontSize: '0.85rem' }}>No status data available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
