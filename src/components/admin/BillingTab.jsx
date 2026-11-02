import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  DollarSign,
  Calendar,
  Clock,
  Printer,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Car,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Building
} from 'lucide-react';
import {
  fetchInvoices,
  fetchInvoiceById,
  createInvoice,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  recordPayment,
  reversePayment,
  fetchOutstandingDues,
  fetchBillingStats,
  fetchJobCards
} from '../../utils/api';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash Payment' },
  { value: 'UPI', label: 'UPI (GPay, PhonePe, Paytm)' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/IMPS/RTGS)' },
  { value: 'CARD', label: 'Debit / Credit Card' },
  { value: 'OTHER', label: 'Other Documented Method' }
];

export default function BillingTab({ isOwner = false }) {
  const [subTab, setSubTab] = useState('invoices'); // 'invoices' | 'outstanding'
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Financial KPIs
  const [billingStats, setBillingStats] = useState({
    totalInvoicedThisMonth: 0,
    paymentsReceivedThisMonth: 0,
    totalOutstandingCustomerDues: 0,
    unpaidInvoicesCount: 0,
    partiallyPaidInvoicesCount: 0
  });

  // Outstanding Dues list
  const [outstandingDues, setOutstandingDues] = useState([]);
  const [outstandingStats, setOutstandingStats] = useState({ totalCount: 0, totalAmount: 0 });
  const [isLoadingOutstanding, setIsLoadingOutstanding] = useState(false);

  // Selected Invoice Modal / Details
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Payment Collection Modal
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Payment Reversal Modal
  const [paymentToReverse, setPaymentToReverse] = useState(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);
  const [reversalError, setReversalError] = useState('');

  // Cancel Invoice Modal (Owner Only)
  const [invoiceToCancel, setInvoiceToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);
  const [cancellationError, setCancellationError] = useState('');

  // Create Invoice from Job Card Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [completedJobCards, setCompletedJobCards] = useState([]);
  const [isLoadingJobCards, setIsLoadingJobCards] = useState(false);
  const [selectedJobCardId, setSelectedJobCardId] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState('');

  // Print Preview Modal
  const [printInvoiceDoc, setPrintInvoiceDoc] = useState(null);

  // Load Invoices
  const loadInvoices = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchInvoices({
        page,
        limit: 15,
        search: searchQuery.trim() || undefined,
        paymentStatus: paymentStatusFilter === 'ALL' ? undefined : paymentStatusFilter,
        invoiceStatus: invoiceStatusFilter === 'ALL' ? undefined : invoiceStatusFilter,
        dateFrom: dateFilter || undefined,
        dateTo: dateFilter || undefined
      });
      setInvoices(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, paymentStatusFilter, invoiceStatusFilter, dateFilter]);

  // Load Stats
  const loadStats = useCallback(async () => {
    try {
      const stats = await fetchBillingStats();
      setBillingStats(stats || {});
    } catch (err) {
      console.warn('Failed to load billing stats:', err.message);
    }
  }, []);

  // Load Outstanding Dues
  const loadOutstanding = useCallback(async () => {
    setIsLoadingOutstanding(true);
    try {
      const res = await fetchOutstandingDues({ search: searchQuery.trim() || undefined });
      const list = Array.isArray(res.data) ? res.data : (res.data?.customers || res.customers || []);
      setOutstandingDues(list);
      setOutstandingStats({
        totalCount: res.totalOutstandingDuesCount || res.data?.summary?.totalCount || list.length,
        totalAmount: res.totalOutstandingAmount || res.data?.summary?.totalOutstanding || 0
      });
    } catch (err) {
      console.warn('Failed to load outstanding dues:', err.message);
    } finally {
      setIsLoadingOutstanding(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadInvoices(1);
    loadStats();
  }, [loadInvoices, loadStats]);

  useEffect(() => {
    if (subTab === 'outstanding') {
      loadOutstanding();
    }
  }, [subTab, loadOutstanding]);

  // Load Completed Job Cards for Invoice Creation Modal
  const handleOpenCreateModal = async () => {
    setCreateError('');
    setSelectedJobCardId('');
    setShowCreateModal(true);
    setIsLoadingJobCards(true);
    try {
      const res = await fetchJobCards({ status: 'COMPLETED', limit: 50 });
      setCompletedJobCards(res.data || []);
    } catch (err) {
      setCreateError(err.message || 'Failed to load completed Job Cards.');
    } finally {
      setIsLoadingJobCards(false);
    }
  };

  // Submit Invoice Creation
  const handleCreateInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJobCardId) {
      setCreateError('Please select a completed Job Card.');
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError('');
    try {
      const res = await createInvoice({ jobCardId: selectedJobCardId });
      setSuccessMessage(`Invoice ${res.data.invoiceNumber} created in DRAFT status.`);
      setShowCreateModal(false);
      loadInvoices(1);
      loadStats();
    } catch (err) {
      setCreateError(err.message || 'Failed to generate invoice.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Invoice Details
  const handleViewInvoice = async (invoiceId) => {
    setIsLoadingDetails(true);
    try {
      const data = await fetchInvoiceById(invoiceId);
      setSelectedInvoice(data);
    } catch (err) {
      setError(err.message || 'Failed to load invoice details.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Issue Draft Invoice
  const handleIssueInvoice = async (invoiceId) => {
    setError('');
    setSuccessMessage('');
    try {
      await issueInvoice(invoiceId);
      setSuccessMessage('Invoice issued successfully and debited to customer khatta.');
      loadInvoices(pagination.page);
      loadStats();
      if (selectedInvoice?._id === invoiceId) {
        handleViewInvoice(invoiceId);
      }
    } catch (err) {
      setError(err.message || 'Failed to issue invoice.');
    }
  };

  // Open Payment Modal
  const handleOpenPayment = (invoice) => {
    setPaymentInvoice(invoice);
    setPaymentAmount(invoice.balanceDue?.toFixed(2) || '');
    setPaymentMethod('UPI');
    setTransactionRef('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentNotes('');
    setPaymentError('');
  };

  // Submit Payment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    setPaymentError('');

    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (amt > paymentInvoice.balanceDue) {
      setPaymentError(`Payment amount cannot exceed remaining balance of ₹${paymentInvoice.balanceDue.toFixed(2)}.`);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await recordPayment(paymentInvoice._id, {
        amount: amt,
        paymentMethod,
        transactionReference: transactionRef.trim(),
        paymentDate,
        notes: paymentNotes.trim()
      });

      setSuccessMessage(`Payment of ₹${amt.toFixed(2)} recorded and credited to customer khatta.`);
      setPaymentInvoice(null);
      loadInvoices(pagination.page);
      loadStats();
      if (subTab === 'outstanding') loadOutstanding();
      if (selectedInvoice?._id === paymentInvoice._id) {
        handleViewInvoice(paymentInvoice._id);
      }
    } catch (err) {
      setPaymentError(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Reverse Payment (Owner Only)
  const handleReversePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentToReverse) return;
    if (!reversalReason.trim()) {
      setReversalError('Documented justification reason is mandatory.');
      return;
    }

    setIsSubmittingReversal(true);
    setReversalError('');
    try {
      await reversePayment(paymentToReverse._id, {
        reversalReason: reversalReason.trim()
      });

      setSuccessMessage(`Payment ${paymentToReverse.paymentReference} reversed and debited to customer khatta.`);
      setPaymentToReverse(null);
      loadInvoices(pagination.page);
      loadStats();
      if (subTab === 'outstanding') loadOutstanding();
      if (selectedInvoice) {
        handleViewInvoice(selectedInvoice._id);
      }
    } catch (err) {
      setReversalError(err.message || 'Failed to reverse payment.');
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  // Cancel Invoice Submit (Owner Only)
  const handleCancelInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceToCancel) return;
    if (!cancellationReason.trim()) {
      setCancellationError('Documented reason is mandatory.');
      return;
    }

    setIsSubmittingCancellation(true);
    setCancellationError('');
    try {
      await cancelInvoice(invoiceToCancel._id, {
        cancellationReason: cancellationReason.trim()
      });

      setSuccessMessage(`Invoice ${invoiceToCancel.invoiceNumber} cancelled successfully.`);
      setInvoiceToCancel(null);
      loadInvoices(pagination.page);
      loadStats();
      if (selectedInvoice?._id === invoiceToCancel._id) {
        handleViewInvoice(invoiceToCancel._id);
      }
    } catch (err) {
      setCancellationError(err.message || 'Failed to cancel invoice.');
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  return (
    <div className="tab-pane-container">
      {/* ============================================================== */}
      {/* FINANCIAL KPIS / EXECUTIVE DASHBOARD                           */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="kpi-card bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Invoiced This Month</span>
            <TrendingUp size={16} className="text-blue-600" />
          </div>
          <div className="text-xl font-bold font-heading text-slate-900">
            ₹{billingStats.totalInvoicedThisMonth?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Total billing value generated</span>
        </div>

        <div className="kpi-card bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Received This Month</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-heading text-emerald-700">
            ₹{billingStats.paymentsReceivedThisMonth?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Actual cash/UPI collected</span>
        </div>

        <div className="kpi-card bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Customer Dues</span>
            <AlertCircle size={16} className="text-red-600" />
          </div>
          <div className="text-xl font-bold font-heading text-red-700">
            ₹{billingStats.totalOutstandingCustomerDues?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Total unpaid customer balance</span>
        </div>

        <div className="kpi-card bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Unpaid Invoices</span>
            <Receipt size={16} className="text-amber-600" />
          </div>
          <div className="text-xl font-bold font-heading text-slate-800">
            {billingStats.unpaidInvoicesCount || 0}
            <span className="text-xs text-amber-600 font-normal ml-2">
              ({billingStats.partiallyPaidInvoicesCount || 0} partial)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Invoices pending collection</span>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="admin-alert-banner alert-danger mb-3">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="admin-alert-banner alert-success mb-3">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* SUB-NAVIGATION & ACTIONS BAR */}
      <div className="admin-tab-toolbar mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`btn btn-sm ${subTab === 'invoices' ? 'btn-primary' : 'btn-outline-dark'}`}
            onClick={() => setSubTab('invoices')}
          >
            <Receipt size={14} className="mr-1.5 inline" />
            All Invoices
          </button>
          <button
            type="button"
            className={`btn btn-sm ${subTab === 'outstanding' ? 'btn-primary' : 'btn-outline-dark'}`}
            onClick={() => setSubTab('outstanding')}
          >
            <AlertCircle size={14} className="mr-1.5 inline text-amber-400" />
            Outstanding Dues & Aging
          </button>
        </div>

        {subTab === 'invoices' && (
          <button
            type="button"
            className="btn btn-primary btn-sm flex items-center gap-1.5 ml-auto"
            onClick={handleOpenCreateModal}
          >
            <Plus size={16} />
            <span>Generate Invoice from Job Card</span>
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* SUB-VIEW 1: INVOICES REGISTRY                                 */}
      {/* ============================================================== */}
      {subTab === 'invoices' && (
        <>
          {/* SEARCH & FILTERS BAR */}
          <div className="admin-filters-bar mb-3">
            <div className="search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search invoice #, customer name, mobile, vehicle plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-select-wrap">
              <select
                className="filter-select"
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
              >
                <option value="ALL">Payment: All</option>
                <option value="UNPAID">Payment: Unpaid</option>
                <option value="PARTIALLY_PAID">Payment: Partially Paid</option>
                <option value="PAID">Payment: Paid</option>
              </select>

              <select
                className="filter-select"
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
              >
                <option value="ALL">Status: All</option>
                <option value="DRAFT">Status: Draft</option>
                <option value="ISSUED">Status: Issued</option>
                <option value="CANCELLED">Status: Cancelled</option>
              </select>

              <input
                type="date"
                className="filter-date-input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                title="Filter by issue date"
              />
            </div>
          </div>

          {/* INVOICES TABLE */}
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer & Vehicle</th>
                  <th>Date</th>
                  <th className="text-right">Grand Total (₹)</th>
                  <th className="text-right">Paid (₹)</th>
                  <th className="text-right">Balance Due (₹)</th>
                  <th>Payment Status</th>
                  <th>Invoice Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-slate-500">
                      Loading invoice records...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-slate-500">
                      No invoices found matching criteria.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv._id}>
                      <td>
                        <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                        {inv.jobCardSnapshot?.jobCardNumber && (
                          <span className="block text-[11px] text-slate-400 font-mono">
                            JC: {inv.jobCardSnapshot.jobCardNumber}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="font-semibold text-slate-800 text-xs">
                          {inv.customerSnapshot?.fullName || 'Customer'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span className="font-mono text-amber-700 font-semibold">
                            {inv.vehicleSnapshot?.registrationNumber || 'PROVISIONAL'}
                          </span>
                          <span>• {inv.vehicleSnapshot?.brand} {inv.vehicleSnapshot?.model}</span>
                        </div>
                      </td>
                      <td className="text-xs text-slate-600">
                        {inv.issueDate
                          ? new Date(inv.issueDate).toLocaleDateString('en-IN')
                          : new Date(inv.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="text-right font-bold text-slate-900 text-xs">
                        ₹{inv.grandTotal?.toFixed(2)}
                      </td>
                      <td className="text-right text-emerald-700 text-xs font-semibold">
                        ₹{inv.amountPaid?.toFixed(2)}
                      </td>
                      <td className="text-right text-red-700 text-xs font-bold">
                        ₹{inv.balanceDue?.toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge-payment-${inv.paymentStatus?.toLowerCase()} px-2 py-0.5 rounded text-[10px] font-bold`}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-invoice-${inv.invoiceStatus?.toLowerCase()} px-2 py-0.5 rounded text-[10px] font-bold`}>
                          {inv.invoiceStatus}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="btn btn-outline-dark btn-sm text-[11px] py-1 px-2"
                            onClick={() => handleViewInvoice(inv._id)}
                          >
                            View
                          </button>

                          {inv.invoiceStatus === 'DRAFT' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm text-[11px] py-1 px-2"
                              onClick={() => handleIssueInvoice(inv._id)}
                            >
                              Issue
                            </button>
                          )}

                          {inv.invoiceStatus === 'ISSUED' && inv.balanceDue > 0 && (
                            <button
                              type="button"
                              className="btn btn-outline-red btn-sm text-[11px] py-1 px-2"
                              onClick={() => handleOpenPayment(inv)}
                            >
                              Pay
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-outline-dark btn-sm text-[11px] py-1 px-2"
                            onClick={() => setPrintInvoiceDoc(inv)}
                            title="Print A4 Invoice"
                          >
                            <Printer size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {pagination.totalPages > 1 && (
            <div className="pagination-bar mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} invoices)
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm text-xs py-1 px-2.5"
                  disabled={pagination.page <= 1}
                  onClick={() => loadInvoices(pagination.page - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm text-xs py-1 px-2.5"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadInvoices(pagination.page + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 2: OUTSTANDING DUES & AGING                          */}
      {/* ============================================================== */}
      {subTab === 'outstanding' && (
        <div className="outstanding-dues-view space-y-3">
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex-wrap gap-2">
            <div>
              <strong>Total Overdue / Outstanding Balance:</strong>{' '}
              <span className="font-bold text-red-700 text-sm">
                ₹{outstandingStats.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>{' '}
              across {outstandingStats.totalCount} active invoice(s).
            </div>
            <button
              type="button"
              className="btn btn-outline-dark btn-sm text-xs"
              onClick={loadOutstanding}
            >
              Refresh Dues
            </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Invoice #</th>
                  <th>Issue Date</th>
                  <th className="text-right">Grand Total (₹)</th>
                  <th className="text-right">Paid (₹)</th>
                  <th className="text-right">Balance Due (₹)</th>
                  <th>Aging (Days)</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingOutstanding ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-slate-500">
                      Loading outstanding accounts...
                    </td>
                  </tr>
                ) : outstandingDues.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-emerald-700 font-semibold">
                      All customer dues are fully cleared! No outstanding balances.
                    </td>
                  </tr>
                ) : (
                  outstandingDues.map((due) => (
                    <tr key={due._id}>
                      <td>
                        <strong className="text-slate-900 block">{due.customerName}</strong>
                        <a href={`tel:${due.customerMobile}`} className="text-blue-600 text-[11px]">
                          {due.customerMobile}
                        </a>
                      </td>
                      <td>
                        <span className="font-mono font-bold text-amber-700 text-xs block">
                          {due.vehiclePlate}
                        </span>
                        <span className="text-[11px] text-slate-500">{due.vehicleModel}</span>
                      </td>
                      <td className="font-mono text-xs">{due.invoiceNumber}</td>
                      <td className="text-xs text-slate-600">
                        {new Date(due.issueDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="text-right text-xs font-semibold">₹{due.grandTotal?.toFixed(2)}</td>
                      <td className="text-right text-xs text-emerald-700">₹{due.amountPaid?.toFixed(2)}</td>
                      <td className="text-right text-xs font-bold text-red-700">
                        ₹{due.balanceDue?.toFixed(2)}
                      </td>
                      <td>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            due.daysOutstanding > 30
                              ? 'bg-rose-100 text-rose-800'
                              : due.daysOutstanding > 7
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {due.daysOutstanding} day{due.daysOutstanding === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm text-[11px] py-1 px-2.5"
                          onClick={() => handleOpenPayment(due)}
                        >
                          Collect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. GENERATE INVOICE FROM JOB CARD MODAL                        */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Generate Invoice from Completed Job Card</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit}>
              <div className="modal-body space-y-3">
                {createError && (
                  <div className="admin-alert-banner alert-danger text-xs">
                    <AlertCircle size={16} />
                    <span>{createError}</span>
                  </div>
                )}

                <p className="text-xs text-slate-600">
                  Select a completed workshop Job Card to generate a final invoice. Approved estimate items and requested services will be automatically populated into a draft invoice.
                </p>

                <div>
                  <label className="input-label text-xs">Select Completed Job Card:</label>
                  {isLoadingJobCards ? (
                    <div className="text-xs text-slate-400 py-2">Loading completed Job Cards...</div>
                  ) : completedJobCards.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500">
                      No completed Job Cards available for billing. Complete a Job Card in workshop operations first.
                    </div>
                  ) : (
                    <select
                      className="login-input text-xs py-2"
                      value={selectedJobCardId}
                      onChange={(e) => setSelectedJobCardId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Completed Job Card --</option>
                      {completedJobCards.map((jc) => (
                        <option key={jc._id} value={jc._id}>
                          {jc.jobCardNumber} — {jc.customerSnapshot?.fullName} ({jc.vehicleSnapshot?.registrationNumber} {jc.vehicleSnapshot?.brand} {jc.vehicleSnapshot?.model})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingCreate || completedJobCards.length === 0}
                >
                  {isSubmittingCreate ? 'Generating...' : 'Create Draft Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. PAYMENT COLLECTION MODAL                                    */}
      {/* ============================================================== */}
      {paymentInvoice && (
        <div className="admin-modal-backdrop" onClick={() => setPaymentInvoice(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-600" />
                <span>Collect Customer Payment</span>
              </h3>
              <button className="modal-close-btn" onClick={() => setPaymentInvoice(null)}>×</button>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body space-y-3">
                {paymentError && (
                  <div className="admin-alert-banner alert-danger text-xs">
                    <AlertCircle size={16} />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Invoice Summary Box */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-800">Invoice Reference:</span>
                    <span className="font-mono">{paymentInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-semibold">{paymentInvoice.customerSnapshot?.fullName || paymentInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Invoiced:</span>
                    <span>₹{paymentInvoice.grandTotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Amount Already Paid:</span>
                    <span>₹{paymentInvoice.amountPaid?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-300 font-bold text-sm text-red-700">
                    <span>Remaining Balance Due:</span>
                    <span>₹{paymentInvoice.balanceDue?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Amount input with Quick Full Payment button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="input-label text-xs">Payment Amount (₹):</label>
                    <button
                      type="button"
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                      onClick={() => setPaymentAmount(paymentInvoice.balanceDue?.toFixed(2) || '')}
                    >
                      Fill Full Balance (₹{paymentInvoice.balanceDue?.toFixed(2)})
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max={paymentInvoice.balanceDue}
                    className="login-input text-sm font-bold text-slate-900"
                    placeholder="Enter payment amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="input-label text-xs">Payment Method:</label>
                  <select
                    className="login-input text-xs py-2"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Transaction Reference */}
                <div>
                  <label className="input-label text-xs">Transaction Reference / UTR Number:</label>
                  <input
                    type="text"
                    className="login-input text-xs py-1.5"
                    placeholder="e.g. UPI Ref / Cheque # / IMPS UTR (Optional)"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                  />
                </div>

                {/* Payment Date */}
                <div>
                  <label className="input-label text-xs">Payment Date:</label>
                  <input
                    type="date"
                    className="login-input text-xs py-1.5"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>

                {/* Staff Notes */}
                <div>
                  <label className="input-label text-xs">Staff Payment Notes:</label>
                  <textarea
                    className="login-input text-xs"
                    rows={2}
                    placeholder="Customer receipt notes..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setPaymentInvoice(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingPayment}
                >
                  {isSubmittingPayment ? 'Recording...' : 'Record Payment & Credit Khatta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. INVOICE DOSSIER & ASSOCIATED PAYMENTS MODAL                 */}
      {/* ============================================================== */}
      {selectedInvoice && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedInvoice(null)}>
          <div className="admin-modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title font-mono">{selectedInvoice.invoiceNumber}</h3>
                <span className={`badge-invoice-${selectedInvoice.invoiceStatus?.toLowerCase()} text-[10px] font-bold px-1.5 py-0.5 rounded mr-2`}>
                  {selectedInvoice.invoiceStatus}
                </span>
                <span className={`badge-payment-${selectedInvoice.paymentStatus?.toLowerCase()} text-[10px] font-bold px-1.5 py-0.5 rounded`}>
                  {selectedInvoice.paymentStatus}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm text-xs"
                  onClick={() => setPrintInvoiceDoc(selectedInvoice)}
                >
                  <Printer size={14} className="mr-1 inline" />
                  Print A4
                </button>
                <button className="modal-close-btn" onClick={() => setSelectedInvoice(null)}>×</button>
              </div>
            </div>

            <div className="modal-body space-y-4">
              {/* Snapshots Grid */}
              <div className="dossier-grid">
                <div className="dossier-card">
                  <h4 className="dossier-card-title">
                    <User size={15} /> Customer Details
                  </h4>
                  <div className="dossier-data-list text-xs">
                    <div><strong>Name:</strong> {selectedInvoice.customerSnapshot?.fullName}</div>
                    <div><strong>Mobile:</strong> {selectedInvoice.customerSnapshot?.mobileNumber}</div>
                    <div><strong>City:</strong> {selectedInvoice.customerSnapshot?.city || 'Gohana'}</div>
                  </div>
                </div>

                <div className="dossier-card">
                  <h4 className="dossier-card-title">
                    <Car size={15} /> Vehicle Details
                  </h4>
                  <div className="dossier-data-list text-xs">
                    <div><strong>Vehicle:</strong> {selectedInvoice.vehicleSnapshot?.brand} {selectedInvoice.vehicleSnapshot?.model}</div>
                    <div><strong>Plate:</strong> <span className="font-mono text-amber-700 font-bold">{selectedInvoice.vehicleSnapshot?.registrationNumber}</span></div>
                    <div><strong>Job Card:</strong> {selectedInvoice.jobCardSnapshot?.jobCardNumber}</div>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="dossier-card">
                <h4 className="dossier-card-title">Itemized Services & Parts</h4>
                <div className="overflow-x-auto">
                  <table className="estimate-table text-xs">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Item Description</th>
                        <th>Type</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Unit Price</th>
                        <th className="text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="text-slate-400">{idx + 1}</td>
                          <td>
                            <strong>{it.itemName}</strong>
                            {it.description && <span className="block text-[11px] text-slate-500">{it.description}</span>}
                          </td>
                          <td><span className="item-type-badge">{it.itemType}</span></td>
                          <td className="text-right">{it.quantity}</td>
                          <td className="text-right">₹{it.unitPrice?.toFixed(2)}</td>
                          <td className="text-right font-bold">₹{it.lineTotal?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals & Balances */}
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
                  <div className="w-full max-w-xs text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{selectedInvoice.subtotal?.toFixed(2)}</span>
                    </div>
                    {selectedInvoice.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount:</span>
                        <span>-₹{selectedInvoice.discountAmount?.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedInvoice.taxRate > 0 && (
                      <div className="flex justify-between">
                        <span>GST ({selectedInvoice.taxRate}%):</span>
                        <span>₹{selectedInvoice.taxAmount?.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm text-slate-900 border-t pt-1">
                      <span>Grand Total:</span>
                      <span>₹{selectedInvoice.grandTotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Amount Paid:</span>
                      <span>₹{selectedInvoice.amountPaid?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-700 border-t pt-1">
                      <span>Balance Due:</span>
                      <span>₹{selectedInvoice.balanceDue?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Associated Payments Section */}
              <div className="dossier-card">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="dossier-card-title flex items-center gap-1.5">
                    <CreditCard size={15} /> Associated Payments ({selectedInvoice.payments?.length || 0})
                  </h4>
                  {selectedInvoice.invoiceStatus === 'ISSUED' && selectedInvoice.balanceDue > 0 && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm text-xs py-1"
                      onClick={() => handleOpenPayment(selectedInvoice)}
                    >
                      + Collect Payment
                    </button>
                  )}
                </div>

                {(selectedInvoice.payments || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No payment records received for this invoice yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedInvoice.payments.map((p) => (
                      <div
                        key={p._id}
                        className={`p-2.5 rounded border text-xs flex items-center justify-between flex-wrap gap-2 ${
                          p.status === 'REVERSED' ? 'bg-slate-100 border-slate-300 opacity-60' : 'bg-white border-emerald-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{p.paymentReference}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'REVERSED' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {p.status}
                            </span>
                            <span className="text-slate-500 font-semibold">{p.paymentMethod}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Received on {new Date(p.paymentDate).toLocaleDateString('en-IN')} by {p.receivedBy?.fullName || 'Staff'}
                            {p.transactionReference && ` • Ref: ${p.transactionReference}`}
                          </div>
                          {p.reversalReason && (
                            <div className="text-[11px] text-rose-700 italic mt-0.5">
                              Reversal reason: "{p.reversalReason}"
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm text-emerald-700">
                            ₹{p.amount?.toFixed(2)}
                          </span>

                          {isOwner && p.status === 'COMPLETED' && (
                            <button
                              type="button"
                              className="btn btn-outline-dark btn-sm text-[11px] py-0.5 px-2 text-rose-700 border-rose-300"
                              onClick={() => {
                                setPaymentToReverse(p);
                                setReversalReason('');
                                setReversalError('');
                              }}
                              title="Reverse payment (Owner Only)"
                            >
                              <RotateCcw size={12} className="mr-1 inline" />
                              Reverse
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {isOwner && selectedInvoice.invoiceStatus !== 'CANCELLED' && selectedInvoice.amountPaid === 0 && (
                <button
                  type="button"
                  className="btn btn-outline-dark text-xs text-rose-700 border-rose-300 mr-auto"
                  onClick={() => {
                    setInvoiceToCancel(selectedInvoice);
                    setCancellationReason('');
                    setCancellationError('');
                  }}
                >
                  <XCircle size={14} className="mr-1 inline" />
                  Cancel Invoice (Owner Only)
                </button>
              )}

              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={() => setSelectedInvoice(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. PAYMENT REVERSAL MODAL (OWNER ONLY)                         */}
      {/* ============================================================== */}
      {paymentToReverse && (
        <div className="admin-modal-backdrop" onClick={() => setPaymentToReverse(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2 text-rose-700">
                <RotateCcw size={18} />
                <span>OWNER Reversal: Payment {paymentToReverse.paymentReference}</span>
              </h3>
              <button className="modal-close-btn" onClick={() => setPaymentToReverse(null)}>×</button>
            </div>

            <form onSubmit={handleReversePaymentSubmit}>
              <div className="modal-body space-y-3">
                {reversalError && (
                  <div className="admin-alert-banner alert-danger text-xs">
                    <AlertCircle size={16} />
                    <span>{reversalError}</span>
                  </div>
                )}

                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900 leading-relaxed">
                  <strong>Financial Audit Warning:</strong> Reversing payment <strong>{paymentToReverse.paymentReference}</strong> (₹{paymentToReverse.amount?.toFixed(2)}) will restore the unpaid balance on the invoice and append a debit reversal entry to the customer's digital khatta.
                </div>

                <div>
                  <label className="input-label text-xs">Mandatory Reversal Justification / Reason:</label>
                  <textarea
                    className="login-input text-xs"
                    rows={3}
                    placeholder="e.g. 'UPI payment bounced / chargeback' or 'Customer cheque returned unpaid by bank'..."
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setPaymentToReverse(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary bg-rose-600 hover:bg-rose-700"
                  disabled={isSubmittingReversal}
                >
                  {isSubmittingReversal ? 'Reversing...' : 'Confirm Payment Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. INVOICE CANCELLATION MODAL (OWNER ONLY)                     */}
      {/* ============================================================== */}
      {invoiceToCancel && (
        <div className="admin-modal-backdrop" onClick={() => setInvoiceToCancel(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2 text-rose-700">
                <XCircle size={18} />
                <span>Cancel Invoice {invoiceToCancel.invoiceNumber}</span>
              </h3>
              <button className="modal-close-btn" onClick={() => setInvoiceToCancel(null)}>×</button>
            </div>

            <form onSubmit={handleCancelInvoiceSubmit}>
              <div className="modal-body space-y-3">
                {cancellationError && (
                  <div className="admin-alert-banner alert-danger text-xs">
                    <AlertCircle size={16} />
                    <span>{cancellationError}</span>
                  </div>
                )}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 leading-relaxed">
                  <strong>Audit Warning:</strong> Cancelling an invoice cannot be undone. If the invoice was already issued, a credit adjustment will be recorded in customer khatta to neutralize the debited balance.
                </div>

                <div>
                  <label className="input-label text-xs">Mandatory Cancellation Reason:</label>
                  <textarea
                    className="login-input text-xs"
                    rows={3}
                    placeholder="e.g. 'Billing error / scope disputed before work delivered'..."
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setInvoiceToCancel(null)}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="btn btn-primary bg-rose-600 hover:bg-rose-700"
                  disabled={isSubmittingCancellation}
                >
                  {isSubmittingCancellation ? 'Cancelling...' : 'Confirm Invoice Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. PRINTABLE A4 INVOICE MODAL                                  */}
      {/* ============================================================== */}
      {printInvoiceDoc && (
        <div className="admin-modal-backdrop" onClick={() => setPrintInvoiceDoc(null)}>
          <div
            className="admin-modal-card modal-lg printable-estimate-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '95vh' }}
          >
            <div className="modal-header no-print">
              <h3 className="modal-title">Print Preview — Tax / Retail Invoice</h3>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-primary btn-sm text-xs" onClick={() => window.print()}>
                  <Printer size={14} className="mr-1 inline" />
                  Print A4 Document
                </button>
                <button className="modal-close-btn" onClick={() => setPrintInvoiceDoc(null)}>×</button>
              </div>
            </div>

            <div className="modal-body overflow-y-auto">
              <div className="printable-estimate-container">
                {/* Brand Header */}
                <div className="print-brand-header">
                  <div>
                    <h2 className="print-garage-name">Mahadev Mechanical Car Garage</h2>
                    <p className="print-garage-tagline">Complete Car Care Under One Roof</p>
                    <div className="print-garage-contact">
                      <p>Near Indian Oil Petrol Pump, Rohtak - Panipat Rd, Gohana, Haryana 131301</p>
                      <p>Phone: +91 82956 69463 | Email: mahadevgaragegohana@gmail.com</p>
                    </div>
                  </div>
                  <div className="print-doc-meta">
                    <div className="print-doc-title">FINAL INVOICE</div>
                    <div className="print-doc-number">{printInvoiceDoc.invoiceNumber}</div>
                    <div className="text-xs text-slate-500 font-bold mt-1">
                      Status: {printInvoiceDoc.invoiceStatus} ({printInvoiceDoc.paymentStatus})
                    </div>
                    <div className="text-xs text-slate-500">
                      Issue Date: {printInvoiceDoc.issueDate ? new Date(printInvoiceDoc.issueDate).toLocaleDateString('en-IN') : new Date(printInvoiceDoc.createdAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Customer & Vehicle Meta */}
                <div className="print-meta-grid">
                  <div>
                    <strong className="block text-slate-900 mb-1 border-b pb-0.5">BILLED TO:</strong>
                    <p><strong>Customer Name:</strong> {printInvoiceDoc.customerSnapshot?.fullName}</p>
                    <p><strong>Mobile Number:</strong> {printInvoiceDoc.customerSnapshot?.mobileNumber}</p>
                    {printInvoiceDoc.customerSnapshot?.address && (
                      <p><strong>Address:</strong> {printInvoiceDoc.customerSnapshot.address}, {printInvoiceDoc.customerSnapshot.city || 'Gohana'}</p>
                    )}
                    <p><strong>Job Card #:</strong> {printInvoiceDoc.jobCardSnapshot?.jobCardNumber}</p>
                  </div>
                  <div>
                    <strong className="block text-slate-900 mb-1 border-b pb-0.5">VEHICLE DETAILS:</strong>
                    <p><strong>Make & Model:</strong> {printInvoiceDoc.vehicleSnapshot?.brand} {printInvoiceDoc.vehicleSnapshot?.model}</p>
                    <p><strong>Registration #:</strong> {printInvoiceDoc.vehicleSnapshot?.registrationNumber}</p>
                    <p><strong>Fuel / Odometer:</strong> {printInvoiceDoc.jobCardSnapshot?.fuelLevel} | {printInvoiceDoc.jobCardSnapshot?.odometerReading} km</p>
                  </div>
                </div>

                {/* Items Table */}
                <table className="print-table">
                  <thead>
                    <tr>
                      <th className="w-8">#</th>
                      <th>Item Description</th>
                      <th>Type</th>
                      <th>Unit</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-right">Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printInvoiceDoc.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="text-slate-400">{idx + 1}</td>
                        <td>
                          <strong>{it.itemName}</strong>
                          {it.description && <span className="block text-[11px] text-slate-500">{it.description}</span>}
                        </td>
                        <td>{it.itemType}</td>
                        <td>{it.unit || 'job'}</td>
                        <td className="text-right">{it.quantity}</td>
                        <td className="text-right">₹{it.unitPrice?.toFixed(2)}</td>
                        <td className="text-right font-bold">₹{it.lineTotal?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals & Balances Table */}
                <div className="print-totals-box">
                  <table className="print-totals-table">
                    <tbody>
                      <tr>
                        <td>Subtotal:</td>
                        <td className="text-right font-semibold">₹{printInvoiceDoc.subtotal?.toFixed(2)}</td>
                      </tr>
                      {printInvoiceDoc.discountAmount > 0 && (
                        <tr>
                          <td>Discount:</td>
                          <td className="text-right font-semibold">-₹{printInvoiceDoc.discountAmount?.toFixed(2)}</td>
                        </tr>
                      )}
                      {printInvoiceDoc.taxRate > 0 && (
                        <tr>
                          <td>GST ({printInvoiceDoc.taxRate}%):</td>
                          <td className="text-right font-semibold">₹{printInvoiceDoc.taxAmount?.toFixed(2)}</td>
                        </tr>
                      )}
                      <tr className="border-t border-slate-800 font-bold text-base">
                        <td>Grand Total:</td>
                        <td className="text-right text-red-700">₹{printInvoiceDoc.grandTotal?.toFixed(2)}</td>
                      </tr>
                      <tr className="text-emerald-700 font-semibold">
                        <td>Total Amount Paid:</td>
                        <td className="text-right">₹{printInvoiceDoc.amountPaid?.toFixed(2)}</td>
                      </tr>
                      <tr className="border-t border-slate-300 font-bold text-red-700">
                        <td>Balance Outstanding:</td>
                        <td className="text-right">₹{printInvoiceDoc.balanceDue?.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Terms and Conditions */}
                <div className="print-terms-box">
                  <strong>Terms & Conditions:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    <li>All mechanical and electrical work carried out by Mahadev Garage has been quality tested.</li>
                    <li>Replaced parts are provided to the vehicle owner upon delivery.</li>
                    <li>Queries regarding this invoice should be addressed within 7 days of delivery.</li>
                  </ul>
                </div>

                {/* Signatures */}
                <div className="print-footer-signatures">
                  <div className="sig-block">
                    Customer Signature
                  </div>
                  <div className="sig-block">
                    Authorised Signatory
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer no-print">
              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={() => setPrintInvoiceDoc(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
              >
                <Printer size={14} className="mr-1 inline" />
                Print A4
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
