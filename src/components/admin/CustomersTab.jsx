import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Car,
  FileText,
  Eye,
  Edit3,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Save,
  CheckCircle2,
  Receipt,
  Printer,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Clock,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import {
  fetchCustomers,
  fetchCustomerById,
  updateCustomer,
  fetchCustomerLedger,
  fetchCustomerLedgerSummary,
  recordCustomerLedgerAdjustment
} from '../../utils/api';

export default function CustomersTab({ isOwner = false }) {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Customer Dossier Modal
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [dossierTab, setDossierTab] = useState('profile'); // 'profile' | 'khatta'
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [ledgerDateFilter, setLedgerDateFilter] = useState('ALL');

  // Adjustment Modal
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    direction: 'CREDIT',
    amount: '',
    description: ''
  });
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState('');

  // Edit Customer Modal
  const [editCustomerForm, setEditCustomerForm] = useState(null); // { id, fullName, email, city, address, internalNotes }
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [editCustomerError, setEditCustomerError] = useState('');
  const [editCustomerSuccess, setEditCustomerSuccess] = useState('');

  const loadCustomers = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchCustomers({
        page,
        limit: 15,
        search: searchQuery.trim() || undefined
      });
      setCustomers(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load customer directory.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadCustomers(1);
  }, [loadCustomers]);

  const loadLedger = async (customerId) => {
    setIsLoadingLedger(true);
    try {
      const res = await fetchCustomerLedger(customerId);
      setLedgerEntries(res.entries || []);
      setLedgerSummary(res.summary || null);
    } catch (e) {
      console.warn('Failed to load customer ledger:', e.message);
    } finally {
      setIsLoadingLedger(false);
    }
  };

  const handleOpenDossier = async (id) => {
    setIsLoadingDossier(true);
    setDossierTab('profile');
    try {
      const [customerData, ledgerData] = await Promise.allSettled([
        fetchCustomerById(id),
        fetchCustomerLedger(id)
      ]);
      if (customerData.status === 'fulfilled') {
        setSelectedCustomer(customerData.value);
      } else {
        throw new Error(customerData.reason?.message || 'Failed to load customer profile');
      }
      if (ledgerData.status === 'fulfilled') {
        setLedgerEntries(ledgerData.value.entries || []);
        setLedgerSummary(ledgerData.value.summary || null);
      } else {
        setLedgerEntries([]);
        setLedgerSummary(null);
      }
    } catch (err) {
      alert('Failed to load customer dossier: ' + err.message);
    } finally {
      setIsLoadingDossier(false);
    }
  };

  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedCustomer?._id) return;
    const amountVal = parseFloat(adjustmentForm.amount);
    if (!amountVal || amountVal <= 0) {
      setAdjustmentError('Please enter a valid positive adjustment amount.');
      return;
    }
    if (!adjustmentForm.description.trim()) {
      setAdjustmentError('Please provide a mandatory reason or description for this ledger adjustment.');
      return;
    }

    setIsSubmittingAdjustment(true);
    setAdjustmentError('');
    try {
      await recordCustomerLedgerAdjustment(selectedCustomer._id, {
        direction: adjustmentForm.direction,
        amount: amountVal,
        description: adjustmentForm.description.trim()
      });
      setShowAdjustmentModal(false);
      setAdjustmentForm({ direction: 'CREDIT', amount: '', description: '' });
      await loadLedger(selectedCustomer._id);
    } catch (err) {
      setAdjustmentError(err.message || 'Failed to record ledger adjustment.');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const filteredLedgerEntries = ledgerEntries.filter((entry) => {
    if (ledgerDateFilter === 'ALL') return true;
    const entryDate = new Date(entry.entryDate || entry.createdAt);
    const now = new Date();
    if (ledgerDateFilter === 'TODAY') {
      return entryDate.toDateString() === now.toDateString();
    }
    if (ledgerDateFilter === 'THIS_WEEK') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return entryDate >= sevenDaysAgo;
    }
    if (ledgerDateFilter === 'THIS_MONTH') {
      return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const handleOpenEdit = (customer) => {
    setEditCustomerError('');
    setEditCustomerSuccess('');
    setEditCustomerForm({
      id: customer._id,
      fullName: customer.fullName || '',
      email: customer.email || '',
      city: customer.city || 'Gohana',
      address: customer.address || '',
      internalNotes: customer.internalNotes || ''
    });
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!editCustomerForm) return;

    if (!editCustomerForm.fullName.trim()) {
      setEditCustomerError('Customer name cannot be empty.');
      return;
    }

    setIsSavingCustomer(true);
    setEditCustomerError('');
    setEditCustomerSuccess('');
    try {
      await updateCustomer(editCustomerForm.id, {
        fullName: editCustomerForm.fullName.trim(),
        email: editCustomerForm.email.trim() || undefined,
        city: editCustomerForm.city.trim(),
        address: editCustomerForm.address.trim(),
        internalNotes: editCustomerForm.internalNotes.trim()
      });

      setEditCustomerSuccess('Customer profile updated successfully!');
      setTimeout(() => {
        setEditCustomerForm(null);
        loadCustomers(pagination.page);
        if (selectedCustomer && selectedCustomer._id === editCustomerForm.id) {
          handleOpenDossier(editCustomerForm.id);
        }
      }, 1000);
    } catch (err) {
      setEditCustomerError(err.message || 'Failed to update customer record.');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  return (
    <div className="tab-pane-container">
      {/* Toolbar */}
      <div className="filter-toolbar-card">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search customers by name, 10-digit mobile number, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button className="btn btn-outline-dark btn-sm" onClick={() => loadCustomers(pagination.page)}>
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="admin-alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Content Table */}
      {isLoading ? (
        <div className="tab-loading-state">
          <div className="loading-spinner" />
          <p>Loading customer records...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="admin-content-card empty-card">
          <User size={36} className="empty-icon" />
          <h4 className="empty-title">No customers found</h4>
          <p className="empty-sub">
            {searchQuery
              ? 'No registered customer matches your search query.'
              : 'Customers are registered automatically upon booking or enquiry.'}
          </p>
        </div>
      ) : (
        <div className="admin-content-card no-padding">
          <div className="table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Mobile Number</th>
                  <th>Email</th>
                  <th>City / Area</th>
                  <th>Visits</th>
                  <th>Last Visit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div className="cust-cell">
                        <span className="cust-name font-semibold">{c.fullName}</span>
                        {c.internalNotes && (
                          <span className="text-xs text-amber-500 font-medium">Has Staff Notes</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-sm">{c.mobileNumber}</span>
                    </td>
                    <td>
                      <span className="text-sm text-slate-600">{c.email || '—'}</span>
                    </td>
                    <td>
                      <span className="text-sm">{c.city || 'Gohana'}</span>
                    </td>
                    <td>
                      <span className="status-badge-inline badge-confirmed">
                        {c.totalBookingsCount} {c.totalBookingsCount === 1 ? 'visit' : 'visits'}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500">
                        {c.lastVisitDate ? new Date(c.lastVisitDate).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons-wrap">
                        <button
                          className="btn-action-icon"
                          onClick={() => handleOpenDossier(c._id)}
                          title="View Full Customer Dossier"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn-action-icon"
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Customer Profile & Notes"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="table-pagination-bar">
              <span className="pagination-info">
                Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} registered customers)
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn-pagination"
                  disabled={pagination.page <= 1}
                  onClick={() => loadCustomers(pagination.page - 1)}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  className="btn-pagination"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadCustomers(pagination.page + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CUSTOMER DOSSIER MODAL */}
      {selectedCustomer && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedCustomer(null)}>
          <div className="admin-modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Customer Dossier: {selectedCustomer.fullName}</h3>
                <span className="text-xs text-slate-500 font-mono">ID: {selectedCustomer._id}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedCustomer(null)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Dossier Tabs: Profile & History vs Digital Khatta */}
              <div className="flex border-b border-slate-700/80 mb-4 gap-2">
                <button
                  type="button"
                  className={`px-4 py-2 font-medium text-xs rounded-t-md transition-colors ${
                    dossierTab === 'profile'
                      ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  onClick={() => setDossierTab('profile')}
                >
                  Profile & Fleet History
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 font-medium text-xs rounded-t-md transition-colors flex items-center gap-1.5 ${
                    dossierTab === 'khatta'
                      ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  onClick={() => setDossierTab('khatta')}
                >
                  <Receipt size={14} />
                  <span>Customer Khatta (खाता)</span>
                  {ledgerSummary && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold font-mono ${
                      ledgerSummary.netBalanceDue > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {ledgerSummary.netBalanceDue > 0 ? `₹${ledgerSummary.netBalanceDue.toLocaleString('en-IN')} Due` : '₹0 Due'}
                    </span>
                  )}
                </button>
              </div>

              {dossierTab === 'profile' ? (
                <>
                  {/* Contact Information Card */}
                  <div className="dossier-grid">
                    <div className="dossier-card">
                      <h4 className="dossier-card-title">
                        <User size={16} />
                        <span>Contact Details</span>
                      </h4>
                      <div className="dossier-data-list">
                        <div className="dossier-row">
                          <span className="dossier-k">Full Name:</span>
                          <span className="dossier-v font-semibold">{selectedCustomer.fullName}</span>
                        </div>
                        <div className="dossier-row">
                          <span className="dossier-k">Mobile Number:</span>
                          <span className="dossier-v font-mono">{selectedCustomer.mobileNumber}</span>
                        </div>
                        <div className="dossier-row">
                          <span className="dossier-k">Email Address:</span>
                          <span className="dossier-v">{selectedCustomer.email || 'Not provided'}</span>
                        </div>
                        <div className="dossier-row">
                          <span className="dossier-k">City / Area:</span>
                          <span className="dossier-v">{selectedCustomer.city || 'Gohana'}</span>
                        </div>
                        {selectedCustomer.address && (
                          <div className="dossier-row">
                            <span className="dossier-k">Street Address:</span>
                            <span className="dossier-v">{selectedCustomer.address}</span>
                          </div>
                        )}
                        <div className="dossier-row">
                          <span className="dossier-k">Total Service Visits:</span>
                          <span className="dossier-v font-bold text-red-600">{selectedCustomer.totalBookingsCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Staff Internal Notes */}
                    <div className="dossier-card">
                      <div className="card-header-flex">
                        <h4 className="dossier-card-title">
                          <FileText size={16} />
                          <span>Internal Garage Notes</span>
                        </h4>
                        <button className="btn-text-link" onClick={() => handleOpenEdit(selectedCustomer)}>
                          <Edit3 size={14} /> Edit
                        </button>
                      </div>
                      {selectedCustomer.internalNotes ? (
                        <p className="admin-notes-box text-sm mt-2">{selectedCustomer.internalNotes}</p>
                      ) : (
                        <p className="text-muted text-xs italic mt-2">No internal notes added for this customer yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Linked Vehicles Section */}
                  <div className="dossier-card mt-3">
                    <h4 className="dossier-card-title">
                      <Car size={16} />
                      <span>Linked Vehicles ({selectedCustomer.vehicles?.length || 0})</span>
                    </h4>
                    {(!selectedCustomer.vehicles || selectedCustomer.vehicles.length === 0) ? (
                      <p className="text-muted text-xs mt-1">No registered vehicles linked to this customer.</p>
                    ) : (
                      <div className="table-responsive mt-2">
                        <table className="admin-data-table">
                          <thead>
                            <tr>
                              <th>Registration Plate</th>
                              <th>Make & Model</th>
                              <th>Fuel Type</th>
                              <th>Color</th>
                              <th>Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedCustomer.vehicles.map((v) => (
                              <tr key={v._id}>
                                <td>
                                  <span className="font-mono font-bold text-sm">
                                    {v.registrationNumberDisplay || v.registrationNumberClean || 'Unplated'}
                                  </span>
                                </td>
                                <td>{v.brand} {v.model}</td>
                                <td>{v.fuelType || 'OTHER'}</td>
                                <td>{v.color || '—'}</td>
                                <td>
                                  {v.isProvisional ? (
                                    <span className="provisional-tag">Provisional</span>
                                  ) : (
                                    <span className="status-badge-inline badge-confirmed">Registered</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Service Appointment History */}
                  <div className="dossier-card mt-3">
                    <h4 className="dossier-card-title">
                      <Calendar size={16} />
                      <span>Booking History ({selectedCustomer.appointments?.length || 0})</span>
                    </h4>
                    {(!selectedCustomer.appointments || selectedCustomer.appointments.length === 0) ? (
                      <p className="text-muted text-xs mt-1">No appointment history found.</p>
                    ) : (
                      <div className="table-responsive mt-2">
                        <table className="admin-data-table">
                          <thead>
                            <tr>
                              <th>Reference</th>
                              <th>Date</th>
                              <th>Vehicle</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedCustomer.appointments.map((a) => (
                              <tr key={a._id}>
                                <td>
                                  <span className="booking-ref-badge">{a.bookingReference}</span>
                                </td>
                                <td>
                                  <span className="text-xs">
                                    {new Date(a.preferredDate).toLocaleDateString('en-IN')}
                                  </span>
                                </td>
                                <td>
                                  <span className="text-xs">
                                    {a.vehicleSnapshot?.brand} {a.vehicleSnapshot?.model}
                                  </span>
                                </td>
                                <td>
                                  <span className={`status-badge badge-${(a.status || 'PENDING').toLowerCase()}`}>
                                    {a.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ================= DIGITAL KHATTA / LEDGER VIEW ================= */
                <div className="khatta-dossier-view space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center gap-3">
                      <div className="p-2.5 rounded-md bg-amber-500/10 text-amber-400">
                        <TrendingDown size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Invoiced / Debited</span>
                        <strong className="text-base text-slate-100 font-mono">
                          ₹{(ledgerSummary?.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center gap-3">
                      <div className="p-2.5 rounded-md bg-emerald-500/10 text-emerald-400">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Payments Received</span>
                        <strong className="text-base text-emerald-400 font-mono">
                          ₹{(ledgerSummary?.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center gap-3">
                      <div className={`p-2.5 rounded-md ${
                        (ledgerSummary?.netBalanceDue || 0) > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {(ledgerSummary?.netBalanceDue || 0) > 0 ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Net Balance Due</span>
                        <strong className={`text-base font-mono ${
                          (ledgerSummary?.netBalanceDue || 0) > 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          ₹{(ledgerSummary?.netBalanceDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Toolbar: Filters & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-md border border-slate-800">
                      {['ALL', 'THIS_MONTH', 'THIS_WEEK', 'TODAY'].map((filterKey) => (
                        <button
                          key={filterKey}
                          type="button"
                          className={`text-xs px-2.5 py-1 rounded transition-colors ${
                            ledgerDateFilter === filterKey
                              ? 'bg-amber-500 text-slate-950 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          onClick={() => setLedgerDateFilter(filterKey)}
                        >
                          {filterKey === 'ALL' ? 'All Time' : filterKey === 'THIS_MONTH' ? 'This Month' : filterKey === 'THIS_WEEK' ? 'This Week' : 'Today'}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-dark btn-sm flex items-center gap-1.5"
                        onClick={() => window.print()}
                        title="Print Khatta Account Statement"
                      >
                        <Printer size={14} />
                        <span>Print Statement</span>
                      </button>

                      {isOwner && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm flex items-center gap-1.5"
                          onClick={() => {
                            setAdjustmentError('');
                            setAdjustmentForm({ direction: 'CREDIT', amount: '', description: '' });
                            setShowAdjustmentModal(true);
                          }}
                          title="Record Owner Adjustment or Opening Balance"
                        >
                          <PlusCircle size={14} />
                          <span>+ Record Adjustment</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="table-responsive rounded-lg border border-slate-800">
                    <table className="admin-data-table text-xs">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Direction</th>
                          <th>Reference</th>
                          <th>Description</th>
                          <th className="text-right">Debit (₹)</th>
                          <th className="text-right">Credit (₹)</th>
                          <th className="text-right">Balance After (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLedgerEntries.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-6 text-slate-400 italic">
                              No ledger entries recorded for this time range.
                            </td>
                          </tr>
                        ) : (
                          filteredLedgerEntries.map((entry) => (
                            <tr key={entry._id}>
                              <td className="whitespace-nowrap font-mono text-[11px] text-slate-300">
                                {new Date(entry.entryDate || entry.createdAt).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: '2-digit'
                                })}
                              </td>
                              <td>
                                <span className="status-badge-inline text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-300">
                                  {entry.entryType}
                                </span>
                              </td>
                              <td>
                                <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold ${
                                  entry.direction === 'DEBIT' ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                  {entry.direction === 'DEBIT' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                  {entry.direction}
                                </span>
                              </td>
                              <td className="font-mono text-slate-200">
                                {entry.referenceNumber || '—'}
                              </td>
                              <td className="max-w-[200px] truncate text-slate-300" title={entry.description}>
                                {entry.description || '—'}
                              </td>
                              <td className="text-right font-mono font-medium text-amber-400">
                                {entry.direction === 'DEBIT'
                                  ? `₹${entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : '—'}
                              </td>
                              <td className="text-right font-mono font-medium text-emerald-400">
                                {entry.direction === 'CREDIT'
                                  ? `₹${entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : '—'}
                              </td>
                              <td className="text-right font-mono font-bold text-slate-100">
                                ₹{entry.balanceAfter.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline-dark" onClick={() => setSelectedCustomer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OWNER LEDGER ADJUSTMENT MODAL */}
      {showAdjustmentModal && selectedCustomer && (
        <div className="admin-modal-backdrop" onClick={() => setShowAdjustmentModal(false)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Record Khatta Ledger Adjustment</h3>
                <span className="text-xs text-slate-400">
                  Customer: <strong>{selectedCustomer.fullName}</strong> ({selectedCustomer.mobileNumber})
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAdjustmentModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="modal-body space-y-4">
              {adjustmentError && (
                <div className="admin-alert-banner alert-danger text-xs">
                  <AlertCircle size={16} />
                  <span>{adjustmentError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="input-label">Adjustment Type & Direction *</label>
                <select
                  className="login-input text-xs"
                  value={adjustmentForm.direction}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, direction: e.target.value })}
                >
                  <option value="CREDIT">CREDIT — Reduces Customer Dues (Goodwill, Discount, Refund, Settlement)</option>
                  <option value="DEBIT">DEBIT — Increases Customer Dues (Opening Balance, Charge, Migration)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Adjustment Amount (₹ INR) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="login-input font-mono"
                  placeholder="0.00"
                  value={adjustmentForm.amount}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">Mandatory Audit Reason / Description *</label>
                <textarea
                  className="login-input text-xs"
                  rows={3}
                  placeholder="e.g., Historical opening balance carryover from legacy register, or owner courtesy discount..."
                  value={adjustmentForm.description}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, description: e.target.value })}
                  required
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setShowAdjustmentModal(false)}
                  disabled={isSubmittingAdjustment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingAdjustment}
                >
                  <Save size={16} />
                  <span>{isSubmittingAdjustment ? 'Recording...' : 'Record Adjustment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editCustomerForm && (
        <div className="admin-modal-backdrop" onClick={() => setEditCustomerForm(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Customer Profile</h3>
              <button className="modal-close-btn" onClick={() => setEditCustomerForm(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="modal-body">
              {editCustomerError && (
                <div className="admin-alert-banner alert-danger">
                  <AlertCircle size={16} />
                  <span>{editCustomerError}</span>
                </div>
              )}

              {editCustomerSuccess && (
                <div className="admin-alert-banner alert-success">
                  <CheckCircle2 size={16} />
                  <span>{editCustomerSuccess}</span>
                </div>
              )}

              <div className="form-group">
                <label className="input-label">
                  <span>Full Name:</span>
                </label>
                <input
                  type="text"
                  className="login-input"
                  value={editCustomerForm.fullName}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Email Address:</span>
                </label>
                <input
                  type="email"
                  className="login-input"
                  placeholder="e.g. customer@example.com"
                  value={editCustomerForm.email}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, email: e.target.value })}
                />
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label className="input-label">
                    <span>City:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    value={editCustomerForm.city}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, city: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">
                    <span>Street Address:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    value={editCustomerForm.address}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Internal Garage Staff Notes:</span>
                </label>
                <textarea
                  className="login-input"
                  rows={3}
                  placeholder="Add customer preferences, payment notes, VIP status, or service reminders..."
                  value={editCustomerForm.internalNotes}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, internalNotes: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setEditCustomerForm(null)}
                  disabled={isSavingCustomer}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingCustomer}
                >
                  <Save size={16} />
                  <span>{isSavingCustomer ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
