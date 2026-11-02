import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Printer,
  RotateCcw,
  RefreshCw,
  FileText,
  CreditCard,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ArrowLeft,
  X,
  Trash2,
  ShoppingBag,
  Receipt,
  Scale
} from 'lucide-react';
import {
  fetchSuppliers,
  createSupplier,
  fetchSupplierById,
  updateSupplier,
  toggleSupplierStatus,
  fetchSupplierPurchases,
  createSupplierPurchase,
  cancelSupplierPurchase,
  fetchSupplierPayments,
  recordSupplierPayment,
  reverseSupplierPayment,
  fetchSupplierLedger,
  recordSupplierLedgerAdjustment
} from '../../utils/api';

const SUPPLIER_CATEGORIES = [
  'SPARE_PARTS',
  'ENGINE_OIL',
  'LUBRICANTS',
  'TYRES',
  'BATTERY',
  'CAR_ACCESSORIES',
  'CLEANING_MATERIAL',
  'TOOLS_EQUIPMENT',
  'MACHINE_PARTS',
  'GENERAL',
  'OTHER'
];

const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'];

export default function SuppliersTab({ isOwner }) {
  // Directory state
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedActive, setSelectedActive] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // Selected Supplier Dossier
  const [activeSupplierId, setActiveSupplierId] = useState(null);
  const [activeSupplierData, setActiveSupplierData] = useState(null);
  const [dossierTab, setDossierTab] = useState('overview'); // overview | purchases | payments | khatta | notes

  // Dossier sub-data
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [ledgerData, setLedgerData] = useState({ entries: [], summary: {} });
  const [subDataLoading, setSubDataLoading] = useState(false);

  // Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelPurchaseModal, setShowCancelPurchaseModal] = useState(false);
  const [showReversePaymentModal, setShowReversePaymentModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDocument, setPrintDocument] = useState(null); // { type: 'PURCHASE'|'PAYMENT'|'STATEMENT', data }

  // Target records for action modals
  const [targetPurchase, setTargetPurchase] = useState(null);
  const [targetPayment, setTargetPayment] = useState(null);
  const [reversalReason, setReversalReason] = useState('');

  // Supplier Form Data
  const [supplierFormData, setSupplierFormData] = useState({
    businessName: '',
    contactPerson: '',
    mobileNumber: '',
    alternateMobileNumber: '',
    email: '',
    address: '',
    city: 'Pune',
    state: 'Maharashtra',
    supplierCategory: 'SPARE_PARTS',
    notes: '',
    openingBalance: '0',
    openingBalanceDirection: 'OPENING_PAYABLE'
  });

  // Purchase Form Data
  const [purchaseFormData, setPurchaseFormData] = useState({
    supplierId: '',
    supplierInvoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    items: [{ itemName: '', description: '', quantity: 1, unit: 'pcs', unitPrice: 0, category: 'SPARE_PARTS' }],
    discountAmount: 0,
    taxAmount: 0,
    amountPaid: 0,
    paymentMethod: 'CASH',
    transactionReference: '',
    notes: ''
  });

  // Payment Form Data
  const [paymentFormData, setPaymentFormData] = useState({
    purchaseId: '',
    amount: '',
    paymentMethod: 'CASH',
    paymentDate: new Date().toISOString().split('T')[0],
    transactionReference: '',
    notes: ''
  });

  // Adjustment Form Data
  const [adjustmentFormData, setAdjustmentFormData] = useState({
    amount: '',
    direction: 'DEBIT',
    reason: '',
    entryType: 'ADJUSTMENT'
  });

  const [submitting, setSubmitting] = useState(false);

  // Load Directory
  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 20,
        search,
        category: selectedCategory,
        isActive: selectedActive
      };
      const res = await fetchSuppliers(params);
      if (res.success) {
        setSuppliers(res.data.suppliers || []);
        setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError(err.message || 'Error fetching supplier records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [page, selectedCategory, selectedActive]);

  // Load Dossier details when activeSupplierId changes
  const loadSupplierDossier = async (id) => {
    if (!id) return;
    try {
      setSubDataLoading(true);
      const [dossierRes, purchasesRes, paymentsRes, ledgerRes] = await Promise.all([
        fetchSupplierById(id),
        fetchSupplierPurchases({ supplierId: id, limit: 100 }),
        fetchSupplierPayments(id),
        fetchSupplierLedger(id)
      ]);

      if (dossierRes.success) {
        setActiveSupplierData(dossierRes.data);
      }
      if (purchasesRes.success) {
        setPurchases(purchasesRes.data?.purchases || []);
      }
      if (paymentsRes.success) {
        setPayments(paymentsRes.data || []);
      }
      if (ledgerRes.success) {
        setLedgerData(ledgerRes.data || { entries: [], summary: {} });
      }
    } catch (err) {
      console.error('Failed to load supplier dossier:', err);
      setError(err.message || 'Error loading supplier details.');
    } finally {
      setSubDataLoading(false);
    }
  };

  useEffect(() => {
    if (activeSupplierId) {
      loadSupplierDossier(activeSupplierId);
    }
  }, [activeSupplierId]);

  const handleOpenDossier = (sup) => {
    setActiveSupplierId(sup._id);
    setDossierTab('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDirectory = () => {
    setActiveSupplierId(null);
    setActiveSupplierData(null);
    loadSuppliers();
  };

  // KPI aggregates from current list
  const totalOutstanding = suppliers.reduce((acc, s) => acc + (s.outstandingBalance > 0 ? s.outstandingBalance : 0), 0);
  const totalUnpaidCount = suppliers.reduce((acc, s) => acc + (s.unpaidPurchasesCount || 0), 0);

  const formatCurrency = (amt) => {
    return `₹${Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Create Supplier
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!supplierFormData.businessName.trim() || !supplierFormData.mobileNumber.trim()) {
      setError('Business name and mobile number are required.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const res = await createSupplier({
        ...supplierFormData,
        openingBalance: parseFloat(supplierFormData.openingBalance) || 0
      });
      if (res.success) {
        setSuccessMsg(`Supplier ${res.data?.businessName} registered successfully!`);
        setShowAddSupplierModal(false);
        setSupplierFormData({
          businessName: '',
          contactPerson: '',
          mobileNumber: '',
          alternateMobileNumber: '',
          email: '',
          address: '',
          city: 'Pune',
          state: 'Maharashtra',
          supplierCategory: 'SPARE_PARTS',
          notes: '',
          openingBalance: '0',
          openingBalanceDirection: 'OPENING_PAYABLE'
        });
        setTimeout(() => setSuccessMsg(''), 4000);
        loadSuppliers();
      }
    } catch (err) {
      setError(err.message || 'Failed to register supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Supplier Status
  const handleToggleStatus = async (id) => {
    try {
      const res = await toggleSupplierStatus(id);
      if (res.success) {
        setSuccessMsg(res.message || 'Supplier status updated.');
        setTimeout(() => setSuccessMsg(''), 3000);
        loadSuppliers();
        if (activeSupplierId === id) {
          loadSupplierDossier(id);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to update supplier status.');
    }
  };

  // Purchase Items Handlers
  const handleAddItem = () => {
    setPurchaseFormData({
      ...purchaseFormData,
      items: [
        ...purchaseFormData.items,
        { itemName: '', description: '', quantity: 1, unit: 'pcs', unitPrice: 0, category: 'SPARE_PARTS' }
      ]
    });
  };

  const handleRemoveItem = (index) => {
    if (purchaseFormData.items.length <= 1) return;
    const next = [...purchaseFormData.items];
    next.splice(index, 1);
    setPurchaseFormData({ ...purchaseFormData, items: next });
  };

  const handleItemChange = (index, field, value) => {
    const next = [...purchaseFormData.items];
    next[index][field] = value;
    setPurchaseFormData({ ...purchaseFormData, items: next });
  };

  // Live Purchase Calculation
  const calculatedSubtotal = purchaseFormData.items.reduce((sum, it) => {
    const q = Number(it.quantity) || 0;
    const p = Number(it.unitPrice) || 0;
    return sum + (q * p);
  }, 0);
  const calculatedGrandTotal = Math.max(0, calculatedSubtotal - (Number(purchaseFormData.discountAmount) || 0)) + (Number(purchaseFormData.taxAmount) || 0);
  const calculatedRemainingDue = Math.max(0, calculatedGrandTotal - (Number(purchaseFormData.amountPaid) || 0));

  // Create Purchase Submit
  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    if (!purchaseFormData.supplierId) {
      setError('Please select a supplier.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const res = await createSupplierPurchase({
        ...purchaseFormData,
        discountAmount: Number(purchaseFormData.discountAmount) || 0,
        taxAmount: Number(purchaseFormData.taxAmount) || 0,
        amountPaid: Number(purchaseFormData.amountPaid) || 0
      });
      if (res.success) {
        setSuccessMsg(`Purchase ${res.data?.purchaseNumber} recorded into supplier ledger!`);
        setShowPurchaseModal(false);
        setTimeout(() => setSuccessMsg(''), 4000);
        if (activeSupplierId) {
          loadSupplierDossier(activeSupplierId);
        }
        loadSuppliers();
      }
    } catch (err) {
      setError(err.message || 'Failed to record purchase.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Purchase Submit
  const handleCancelPurchase = async (e) => {
    e.preventDefault();
    if (!reversalReason.trim()) {
      setError('Cancellation reason is required.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const res = await cancelSupplierPurchase(targetPurchase._id, { cancellationReason: reversalReason });
      if (res.success) {
        setSuccessMsg(`Purchase ${targetPurchase.purchaseNumber} cancelled successfully.`);
        setShowCancelPurchaseModal(false);
        setReversalReason('');
        setTargetPurchase(null);
        setTimeout(() => setSuccessMsg(''), 4000);
        if (activeSupplierId) loadSupplierDossier(activeSupplierId);
        loadSuppliers();
      }
    } catch (err) {
      setError(err.message || 'Failed to cancel purchase.');
    } finally {
      setSubmitting(false);
    }
  };

  // Record Payment Submit
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentFormData.amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    const supId = activeSupplierId || paymentFormData.supplierId;
    if (!supId) {
      setError('Supplier ID is missing.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const res = await recordSupplierPayment(supId, {
        ...paymentFormData,
        amount: amt,
        purchaseId: paymentFormData.purchaseId || undefined
      });
      if (res.success) {
        setSuccessMsg(`Payment ${res.data?.paymentReference} of ₹${amt} recorded successfully!`);
        setShowPaymentModal(false);
        setPaymentFormData({
          purchaseId: '',
          amount: '',
          paymentMethod: 'CASH',
          paymentDate: new Date().toISOString().split('T')[0],
          transactionReference: '',
          notes: ''
        });
        setTimeout(() => setSuccessMsg(''), 4000);
        if (activeSupplierId) loadSupplierDossier(activeSupplierId);
        loadSuppliers();
      }
    } catch (err) {
      setError(err.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reverse Payment Submit
  const handleReversePayment = async (e) => {
    e.preventDefault();
    if (!reversalReason.trim()) {
      setError('Reversal reason is mandatory.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const res = await reverseSupplierPayment(targetPayment._id, { reversalReason });
      if (res.success) {
        setSuccessMsg(`Payment ${targetPayment.paymentReference} reversed successfully.`);
        setShowReversePaymentModal(false);
        setReversalReason('');
        setTargetPayment(null);
        setTimeout(() => setSuccessMsg(''), 4000);
        if (activeSupplierId) loadSupplierDossier(activeSupplierId);
        loadSuppliers();
      }
    } catch (err) {
      setError(err.message || 'Failed to reverse payment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Ledger Adjustment Submit
  const handleRecordAdjustment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(adjustmentFormData.amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Adjustment amount must be greater than zero.');
      return;
    }
    if (!adjustmentFormData.reason.trim()) {
      setError('A reason is mandatory for manual ledger adjustments.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const res = await recordSupplierLedgerAdjustment(activeSupplierId, {
        amount: amt,
        direction: adjustmentFormData.direction,
        reason: adjustmentFormData.reason,
        entryType: adjustmentFormData.entryType
      });
      if (res.success) {
        setSuccessMsg('Supplier ledger adjustment recorded successfully.');
        setShowAdjustmentModal(false);
        setAdjustmentFormData({ amount: '', direction: 'DEBIT', reason: '', entryType: 'ADJUSTMENT' });
        setTimeout(() => setSuccessMsg(''), 4000);
        if (activeSupplierId) loadSupplierDossier(activeSupplierId);
        loadSuppliers();
      }
    } catch (err) {
      setError(err.message || 'Failed to record ledger adjustment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="suppliers-tab-content space-y-6">
      {/* Toast Notifications */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-200">
            <X size={16} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="text-sm">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-200">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW A: SUPPLIERS DIRECTORY (If no active supplier selected) */}
      {/* ======================================================== */}
      {!activeSupplierId ? (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Suppliers</span>
                <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Truck size={18} />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold text-white tracking-tight">
                {pagination.total}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Active parts vendors and suppliers</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Dues Payable</span>
                <span className="p-2 bg-red-500/10 text-red-400 rounded-xl">
                  <Scale size={18} />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold text-white tracking-tight font-mono">
                {formatCurrency(totalOutstanding)}
              </div>
              <span className="text-xs text-red-400 mt-1 block">Net balance garage owes to suppliers</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unpaid Purchases</span>
                <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <ShoppingBag size={18} />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold text-white tracking-tight">
                {totalUnpaidCount}
              </div>
              <span className="text-xs text-amber-400 mt-1 block">Purchases with pending balance</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick Actions</span>
                <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Receipt size={18} />
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-lg transition"
                >
                  + Purchase
                </button>
                <button
                  onClick={() => setShowAddSupplierModal(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
                >
                  + Supplier
                </button>
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Direct purchase & vendor registration</span>
            </div>
          </div>

          {/* Directory Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">Suppliers & Vendor Ledger</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track spare parts suppliers, credit purchases, payments, and digital khatta balances
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadSuppliers}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700"
                  title="Refresh Directory"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setShowAddSupplierModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-orange-950/40"
                >
                  <Plus size={16} />
                  <span>Add Supplier</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px] relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by supplier code, business name, mobile, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadSuppliers()}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
              >
                <option value="">All Categories</option>
                {SUPPLIER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>

              <select
                value={selectedActive}
                onChange={(e) => { setSelectedActive(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>

              {(search || selectedCategory || selectedActive) && (
                <button
                  onClick={() => { setSearch(''); setSelectedCategory(''); setSelectedActive(''); setPage(1); }}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Suppliers Table */}
            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Code</th>
                    <th className="py-3 px-4 font-semibold">Business Name</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Contact & Phone</th>
                    <th className="py-3 px-4 font-semibold text-right">Outstanding Balance</th>
                    <th className="py-3 px-4 font-semibold text-center">Unpaid Bills</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-orange-500" />
                        Loading suppliers...
                      </td>
                    </tr>
                  ) : suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No suppliers found matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((s) => (
                      <tr
                        key={s._id}
                        className={`hover:bg-slate-800/30 transition cursor-pointer ${
                          !s.isActive ? 'opacity-60 bg-slate-950/30' : ''
                        }`}
                        onClick={() => handleOpenDossier(s)}
                      >
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                          {s.supplierCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{s.businessName}</div>
                          <div className="text-xs text-slate-400">{s.city || 'Pune'}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg font-medium border border-slate-700">
                            {s.supplierCategory?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-200">{s.contactPerson}</div>
                          <div className="text-xs text-slate-400 font-mono">{s.mobileNumber}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-mono font-bold text-base">
                            {formatCurrency(Math.abs(s.outstandingBalance))}
                          </div>
                          <div className="text-[11px] font-semibold mt-0.5">
                            {s.outstandingBalance > 0 ? (
                              <span className="text-red-400">GARAGE OWES</span>
                            ) : s.outstandingBalance < 0 ? (
                              <span className="text-emerald-400">SUPPLIER CREDIT</span>
                            ) : (
                              <span className="text-slate-400">BALANCED</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {s.unpaidPurchasesCount > 0 ? (
                            <span className="px-2.5 py-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-bold">
                              {s.unpaidPurchasesCount} Unpaid
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              s.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-700/40 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenDossier(s)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
                            >
                              Dossier
                            </button>
                            <button
                              onClick={() => {
                                setPurchaseFormData({ ...purchaseFormData, supplierId: s._id });
                                setShowPurchaseModal(true);
                              }}
                              className="p-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-950/30 rounded-lg transition"
                              title="Record Purchase"
                            >
                              <ShoppingBag size={15} />
                            </button>
                            <button
                              onClick={() => {
                                setPaymentFormData({ ...paymentFormData, supplierId: s._id });
                                setShowPaymentModal(true);
                              }}
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded-lg transition"
                              title="Record Payment"
                            >
                              <CreditCard size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing {suppliers.length} of {pagination.total} suppliers
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-200 transition"
                  >
                    Previous
                  </button>
                  <span>
                    {pagination.page} / {pagination.pages}
                  </span>
                  <button
                    disabled={page >= pagination.pages}
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-200 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ======================================================== */
        /* VIEW B: SUPPLIER DOSSIER (Detailed view with 5 tabs)     */
        /* ======================================================== */
        <div className="space-y-6">
          {/* Dossier Header */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToDirectory}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                  title="Back to Directory"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">
                      {activeSupplierData?.supplier?.businessName || 'Supplier Dossier'}
                    </h2>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-md font-mono">
                      {activeSupplierData?.supplier?.supplierCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        activeSupplierData?.supplier?.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-700/40 text-slate-400'
                      }`}
                    >
                      {activeSupplierData?.supplier?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Contact: {activeSupplierData?.supplier?.contactPerson} | Phone:{' '}
                    {activeSupplierData?.supplier?.mobileNumber} | Category:{' '}
                    {activeSupplierData?.supplier?.supplierCategory?.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPurchaseFormData({ ...purchaseFormData, supplierId: activeSupplierId });
                    setShowPurchaseModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl transition"
                >
                  <Plus size={15} />
                  <span>Record Purchase</span>
                </button>
                <button
                  onClick={() => {
                    setPaymentFormData({ ...paymentFormData, supplierId: activeSupplierId });
                    setShowPaymentModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition"
                >
                  <CreditCard size={15} />
                  <span>Record Payment</span>
                </button>
                {isOwner && (
                  <button
                    onClick={() => handleToggleStatus(activeSupplierId)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
                  >
                    {activeSupplierData?.supplier?.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>

            {/* Dossier Tabs Navigation */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setDossierTab('overview')}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
                  dossierTab === 'overview'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setDossierTab('purchases')}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  dossierTab === 'purchases'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Purchases</span>
                <span className="px-1.5 py-0.2 bg-slate-900 rounded-full text-[10px]">
                  {purchases.length}
                </span>
              </button>
              <button
                onClick={() => setDossierTab('payments')}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  dossierTab === 'payments'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Payments</span>
                <span className="px-1.5 py-0.2 bg-slate-900 rounded-full text-[10px]">
                  {payments.length}
                </span>
              </button>
              <button
                onClick={() => setDossierTab('khatta')}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  dossierTab === 'khatta'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Supplier Khatta (Ledger)</span>
                <span className="px-1.5 py-0.2 bg-slate-900 rounded-full text-[10px]">
                  {ledgerData.entries?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setDossierTab('notes')}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
                  dossierTab === 'notes'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                Notes & Contacts
              </button>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {dossierTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Balance</span>
                  <div className="mt-2 text-2xl font-bold font-mono text-white">
                    {formatCurrency(Math.abs(activeSupplierData?.summary?.currentOutstandingBalance || 0))}
                  </div>
                  <span className="text-xs font-bold mt-1 block">
                    {(activeSupplierData?.summary?.currentOutstandingBalance || 0) > 0 ? (
                      <span className="text-red-400">GARAGE OWES SUPPLIER</span>
                    ) : (activeSupplierData?.summary?.currentOutstandingBalance || 0) < 0 ? (
                      <span className="text-emerald-400">SUPPLIER ADVANCE / CREDIT</span>
                    ) : (
                      <span className="text-slate-400">ACCOUNT BALANCED</span>
                    )}
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Purchases</span>
                  <div className="mt-2 text-2xl font-bold font-mono text-white">
                    {formatCurrency(activeSupplierData?.summary?.totalPurchases || 0)}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Last: {formatDate(activeSupplierData?.summary?.lastPurchaseDate)}
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Payments</span>
                  <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
                    {formatCurrency(activeSupplierData?.summary?.totalPayments || 0)}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Last: {formatDate(activeSupplierData?.summary?.lastPaymentDate)}
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unpaid Purchases</span>
                  <div className="mt-2 text-2xl font-bold text-white">
                    {activeSupplierData?.summary?.unpaidPurchasesCount || 0}
                  </div>
                  <span className="text-xs text-amber-400 mt-1 block">Bills with pending balance</span>
                </div>
              </div>

              {/* Quick Summary Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-4">Account Profile & Opening Balances</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-300">
                  <div>
                    <span className="text-xs text-slate-400 block mb-0.5">Opening Balance</span>
                    <span className="font-mono font-semibold text-white">
                      {formatCurrency(activeSupplierData?.supplier?.openingBalance || 0)}
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {activeSupplierData?.supplier?.openingBalanceDirection === 'OPENING_PAYABLE'
                        ? '(Initial debt to supplier)'
                        : '(Initial supplier credit/advance)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-0.5">City & State</span>
                    <span className="font-medium text-white">
                      {activeSupplierData?.supplier?.city}, {activeSupplierData?.supplier?.state}
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {activeSupplierData?.supplier?.address || 'No local street address specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-0.5">Ledger Integrity Check</span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Append-only audit active
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      Reconciled via MongoDB ACID transaction layer
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PURCHASES */}
          {dossierTab === 'purchases' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">Purchase History</h3>
                  <p className="text-xs text-slate-400">Material and spare parts purchased on cash or credit</p>
                </div>
                <button
                  onClick={() => {
                    setPurchaseFormData({ ...purchaseFormData, supplierId: activeSupplierId });
                    setShowPurchaseModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg transition"
                >
                  <Plus size={14} />
                  <span>Add Purchase</span>
                </button>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800/80">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Purchase #</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Supplier Inv #</th>
                      <th className="py-3 px-4 font-semibold">Items</th>
                      <th className="py-3 px-4 font-semibold text-right">Grand Total</th>
                      <th className="py-3 px-4 font-semibold text-right">Balance Due</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {purchases.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400">
                          No purchases recorded for this supplier yet.
                        </td>
                      </tr>
                    ) : (
                      purchases.map((p) => (
                        <tr
                          key={p._id}
                          className={`hover:bg-slate-800/30 transition ${
                            p.purchaseStatus === 'CANCELLED' ? 'opacity-50 bg-red-950/10' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                            {p.purchaseNumber}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {formatDate(p.purchaseDate)}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-300">
                            {p.supplierInvoiceNumber || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-300">
                            {p.items?.length || 0} item{p.items?.length === 1 ? '' : 's'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                            {formatCurrency(p.grandTotal)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-red-400">
                            {formatCurrency(p.balanceDue)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                p.purchaseStatus === 'CANCELLED'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : p.paymentStatus === 'PAID'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : p.paymentStatus === 'PARTIALLY_PAID'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {p.purchaseStatus === 'CANCELLED' ? 'Cancelled' : p.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setPrintDocument({ type: 'PURCHASE', data: p });
                                  setShowPrintModal(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                                title="Print Purchase Record"
                              >
                                <Printer size={15} />
                              </button>
                              {isOwner && p.purchaseStatus !== 'CANCELLED' && (
                                <button
                                  onClick={() => {
                                    setTargetPurchase(p);
                                    setShowCancelPurchaseModal(true);
                                  }}
                                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition"
                                  title="Cancel Purchase (Owner Only)"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENTS */}
          {dossierTab === 'payments' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">Payment Receipts</h3>
                  <p className="text-xs text-slate-400">All disbursements made to this supplier</p>
                </div>
                <button
                  onClick={() => {
                    setPaymentFormData({ ...paymentFormData, supplierId: activeSupplierId });
                    setShowPaymentModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
                >
                  <Plus size={14} />
                  <span>Record Payment</span>
                </button>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800/80">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Payment Ref</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Payment Mode</th>
                      <th className="py-3 px-4 font-semibold">Txn Reference</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount Paid</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">
                          No payments recorded for this supplier yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((pmt) => (
                        <tr
                          key={pmt._id}
                          className={`hover:bg-slate-800/30 transition ${
                            pmt.status === 'REVERSED' ? 'opacity-50 bg-red-950/10' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                            {pmt.paymentReference}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {formatDate(pmt.paymentDate)}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                              {pmt.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {pmt.transactionReference || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                            {formatCurrency(pmt.amount)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                pmt.status === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {pmt.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setPrintDocument({ type: 'PAYMENT', data: pmt });
                                  setShowPrintModal(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                                title="Print Payment Receipt"
                              >
                                <Printer size={15} />
                              </button>
                              {isOwner && pmt.status === 'COMPLETED' && (
                                <button
                                  onClick={() => {
                                    setTargetPayment(pmt);
                                    setShowReversePaymentModal(true);
                                  }}
                                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition"
                                  title="Reverse Payment (Owner Only)"
                                >
                                  <RotateCcw size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SUPPLIER KHATTA (LEDGER) */}
          {dossierTab === 'khatta' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">Digital Supplier Khatta Statement</h3>
                  <p className="text-xs text-slate-400">
                    Append-only ledger: DEBIT increases amount owed, CREDIT reduces amount owed
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPrintDocument({ type: 'STATEMENT', data: ledgerData });
                      setShowPrintModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                  >
                    <Printer size={14} />
                    <span>Print Statement</span>
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => setShowAdjustmentModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg transition"
                    >
                      <Plus size={14} />
                      <span>Ledger Adjustment</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Running Statement Table */}
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800/80">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Type</th>
                      <th className="py-3 px-4 font-semibold">Reference</th>
                      <th className="py-3 px-4 font-semibold">Description</th>
                      <th className="py-3 px-4 font-semibold text-right text-red-400">Debit (+)</th>
                      <th className="py-3 px-4 font-semibold text-right text-emerald-400">Credit (-)</th>
                      <th className="py-3 px-4 font-semibold text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-mono text-xs">
                    {ledgerData.entries?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center font-sans text-slate-400 text-sm">
                          No ledger transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      ledgerData.entries.map((entry, idx) => (
                        <tr key={entry._id || idx} className="hover:bg-slate-800/20 transition">
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {formatDate(entry.createdAt)}
                          </td>
                          <td className="py-3 px-4 font-sans font-medium whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                              {entry.entryType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-semibold">{entry.referenceNumber}</td>
                          <td className="py-3 px-4 font-sans text-slate-300">{entry.description}</td>
                          <td className="py-3 px-4 text-right text-red-400 font-bold whitespace-nowrap">
                            {entry.direction === 'DEBIT' ? formatCurrency(entry.amount) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-400 font-bold whitespace-nowrap">
                            {entry.direction === 'CREDIT' ? formatCurrency(entry.amount) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white whitespace-nowrap">
                            {formatCurrency(entry.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ledger Totals Footer */}
              <div className="mt-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-400">Total Purchases/Debits: </span>
                  <span className="text-red-400 font-bold">{formatCurrency(ledgerData.summary?.totalDebit)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Total Payments/Credits: </span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(ledgerData.summary?.totalCredit)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Net Balance Due: </span>
                  <span className="text-white font-bold text-sm">
                    {formatCurrency(Math.abs(ledgerData.summary?.netBalanceDue || 0))} (
                    {ledgerData.summary?.balanceDirection || 'BALANCED'})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: NOTES & CONTACTS */}
          {dossierTab === 'notes' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4">Vendor Details & Workshop Notes</h3>
              <div className="space-y-4 max-w-xl text-sm text-slate-300">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Official Address</span>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    {activeSupplierData?.supplier?.address || 'No street address provided.'}
                    <div className="text-xs text-slate-400 mt-1">
                      {activeSupplierData?.supplier?.city}, {activeSupplierData?.supplier?.state}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Primary Mobile</span>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                      {activeSupplierData?.supplier?.mobileNumber}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Alternate Phone</span>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                      {activeSupplierData?.supplier?.alternateMobileNumber || 'N/A'}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block mb-1">Email Address</span>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    {activeSupplierData?.supplier?.email || 'N/A'}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block mb-1">Internal Notes</span>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 italic">
                    {activeSupplierData?.supplier?.notes || 'No internal notes recorded for this supplier.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD SUPPLIER */}
      {/* ======================================================== */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-600/10 text-orange-500 rounded-xl">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Add New Supplier</h3>
                  <p className="text-xs text-slate-400">Register parts vendor and configure initial khatta balance</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddSupplierModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Business / Shop Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Omkar Auto Spares & Lubricants"
                    value={supplierFormData.businessName}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, businessName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={supplierFormData.contactPerson}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="10-digit mobile"
                    value={supplierFormData.mobileNumber}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, mobileNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={supplierFormData.supplierCategory}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, supplierCategory: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    {SUPPLIER_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={supplierFormData.city}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {isOwner && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Opening Balance (₹) [Owner Only]
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={supplierFormData.openingBalance}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, openingBalance: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Balance Direction
                      </label>
                      <select
                        value={supplierFormData.openingBalanceDirection}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, openingBalanceDirection: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                      >
                        <option value="OPENING_PAYABLE">Garage Owes Supplier (Payable)</option>
                        <option value="OPENING_CREDIT">Supplier Owes Garage (Credit/Advance)</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Address / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Street address, shop number, or special supplier terms..."
                    value={supplierFormData.notes}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
                >
                  {submitting ? 'Registering...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: RECORD SUPPLIER PURCHASE */}
      {/* ======================================================== */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-600/10 text-orange-500 rounded-xl">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Record Supplier Purchase</h3>
                  <p className="text-xs text-slate-400">Log incoming parts/materials on credit or cash</p>
                </div>
              </div>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Select Supplier *
                  </label>
                  <select
                    required
                    value={purchaseFormData.supplierId}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, supplierId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.businessName} ({s.supplierCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Supplier Invoice / Bill #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-89210"
                    value={purchaseFormData.supplierInvoiceNumber}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, supplierInvoiceNumber: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseFormData.purchaseDate}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, purchaseDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Purchase Items List */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Purchase Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
                  >
                    + Add Item Row
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {purchaseFormData.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Item name (e.g. Brake Pads)"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                        className="flex-1 min-w-[140px] px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
                      />
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 text-center"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-18 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
                      >
                        <option value="pcs">pcs</option>
                        <option value="ltr">ltr</option>
                        <option value="sets">sets</option>
                        <option value="kg">kg</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="Unit Price"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-24 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 text-right"
                      />
                      <div className="w-24 font-mono font-bold text-xs text-right text-white">
                        {formatCurrency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                      </div>
                      {purchaseFormData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-red-400 hover:text-red-300 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Adjustments & Calculation Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Discount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={purchaseFormData.discountAmount}
                      onChange={(e) => setPurchaseFormData({ ...purchaseFormData, discountAmount: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Tax / GST Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={purchaseFormData.taxAmount}
                      onChange={(e) => setPurchaseFormData({ ...purchaseFormData, taxAmount: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-slate-200"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(calculatedSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Discount:</span>
                    <span>- {formatCurrency(purchaseFormData.discountAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Tax:</span>
                    <span>+ {formatCurrency(purchaseFormData.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-slate-800">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(calculatedGrandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Optional Initial Payment */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                  Immediate Payment (Optional)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Amount Paid (₹)</label>
                    <input
                      type="number"
                      min="0"
                      max={calculatedGrandTotal}
                      step="0.01"
                      placeholder="0.00"
                      value={purchaseFormData.amountPaid}
                      onChange={(e) => setPurchaseFormData({ ...purchaseFormData, amountPaid: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Payment Mode</label>
                    <select
                      value={purchaseFormData.paymentMethod}
                      onChange={(e) => setPurchaseFormData({ ...purchaseFormData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Remaining Due</label>
                    <div className="py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold text-red-400">
                      {formatCurrency(calculatedRemainingDue)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
                >
                  {submitting ? 'Recording...' : 'Record Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: RECORD SUPPLIER PAYMENT */}
      {/* ======================================================== */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600/10 text-emerald-500 rounded-xl">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Record Supplier Payment</h3>
                  <p className="text-xs text-slate-400">Disburse cash, UPI or bank transfer to supplier</p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Payment Target
                </label>
                <select
                  value={paymentFormData.purchaseId}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, purchaseId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- General Supplier Account Payment --</option>
                  {purchases
                    .filter((p) => p.paymentStatus !== 'PAID' && p.purchaseStatus !== 'CANCELLED')
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        Bill {p.purchaseNumber} (Due: ₹{p.balanceDue})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Amount (₹ INR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={paymentFormData.paymentMethod}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.paymentDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  UTR / Cheque / Bank Txn Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / UTR / Cheque Number"
                  value={paymentFormData.transactionReference}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, transactionReference: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Payment remarks..."
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
                >
                  {submitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: CANCEL PURCHASE (OWNER ONLY) */}
      {/* ======================================================== */}
      {showCancelPurchaseModal && targetPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="p-2 bg-red-950/40 border border-red-500/20 rounded-xl">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Cancel Supplier Purchase</h3>
                <p className="text-xs text-red-300/80">Owner-only ledger reversal</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mt-2">
              Are you sure you want to cancel purchase{' '}
              <strong className="text-white">{targetPurchase.purchaseNumber}</strong> for{' '}
              <strong className="text-white">{formatCurrency(targetPurchase.grandTotal)}</strong>?
            </p>
            <p className="text-xs text-slate-400 mt-1">
              A compensating CREDIT will be posted to the supplier ledger to neutralize the purchase debit.
            </p>

            <form onSubmit={handleCancelPurchase} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Cancellation Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify reason for cancelling this purchase..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelPurchaseModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
                >
                  {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: REVERSE PAYMENT (OWNER ONLY) */}
      {/* ======================================================== */}
      {showReversePaymentModal && targetPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="p-2 bg-red-950/40 border border-red-500/20 rounded-xl">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reverse Supplier Payment</h3>
                <p className="text-xs text-red-300/80">Owner-only ledger correction</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mt-2">
              Are you sure you want to reverse payment{' '}
              <strong className="text-white">{targetPayment.paymentReference}</strong> for{' '}
              <strong className="text-white">{formatCurrency(targetPayment.amount)}</strong>?
            </p>
            <p className="text-xs text-slate-400 mt-1">
              The supplier balance owed will be reinstated and a DEBIT ledger entry will be recorded.
            </p>

            <form onSubmit={handleReversePayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Reversal Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify why this payment is being reversed..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReversePaymentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
                >
                  {submitting ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: MANUAL LEDGER ADJUSTMENT (OWNER ONLY) */}
      {/* ======================================================== */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Manual Ledger Adjustment</h3>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordAdjustment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={adjustmentFormData.amount}
                  onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Direction *
                </label>
                <select
                  value={adjustmentFormData.direction}
                  onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, direction: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                >
                  <option value="DEBIT">DEBIT (+) — Increase Amount Garage Owes</option>
                  <option value="CREDIT">CREDIT (-) — Decrease Amount Garage Owes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Mandatory Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this adjustment is necessary..."
                  value={adjustmentFormData.reason}
                  onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, reason: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
                >
                  {submitting ? 'Posting...' : 'Post Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 7: PRINTABLE A4 DOCUMENTS (Purchase / Payment / Statement) */}
      {/* ======================================================== */}
      {showPrintModal && printDocument && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 no-print">
              <h3 className="text-lg font-bold text-white">
                {printDocument.type === 'PURCHASE'
                  ? 'Supplier Purchase Record'
                  : printDocument.type === 'PAYMENT'
                  ? 'Supplier Payment Receipt'
                  : 'Supplier Ledger Statement'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-lg transition"
                >
                  <Printer size={14} />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* A4 Printable Layout */}
            <div className="printable-voucher-card bg-white text-slate-900 p-8 rounded-xl mt-4 font-sans border border-slate-200">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-950 uppercase">
                    Mahadev Mechanical Car Garage
                  </h1>
                  <p className="text-xs text-slate-600">
                    Workshop & Multi-brand Car Care Center
                  </p>
                  <p className="text-xs text-slate-600">
                    Pune - Nashik Highway, Pune, Maharashtra 411001
                  </p>
                  <p className="text-xs text-slate-600">
                    Phone: +91 98220 12345 / +91 98220 54321
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase rounded">
                    {printDocument.type === 'PURCHASE'
                      ? 'Purchase Record'
                      : printDocument.type === 'PAYMENT'
                      ? 'Payment Receipt'
                      : 'Khatta Statement'}
                  </span>
                  <div className="mt-2 text-xs font-mono font-bold text-slate-800">
                    {printDocument.type === 'PURCHASE'
                      ? printDocument.data.purchaseNumber
                      : printDocument.type === 'PAYMENT'
                      ? printDocument.data.paymentReference
                      : `SUP-STMT-${Date.now().toString().slice(-6)}`}
                  </div>
                </div>
              </div>

              {/* Supplier Info */}
              <div className="py-4 border-b border-slate-200 text-xs">
                <div className="font-semibold text-slate-600">Supplier:</div>
                <div className="text-sm font-bold text-slate-950">
                  {activeSupplierData?.supplier?.businessName || printDocument.data?.supplierSnapshot?.businessName}
                </div>
                <div className="text-slate-600">
                  Contact: {activeSupplierData?.supplier?.contactPerson} | Mobile:{' '}
                  {activeSupplierData?.supplier?.mobileNumber}
                </div>
              </div>

              {/* Dynamic Body based on document type */}
              {printDocument.type === 'PURCHASE' && (
                <div className="py-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Purchased Items
                  </div>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-slate-600">
                        <th className="py-1">Item</th>
                        <th className="py-1 text-center">Qty</th>
                        <th className="py-1 text-right">Unit Price</th>
                        <th className="py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printDocument.data.items?.map((it, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-1.5">{it.itemName}</td>
                          <td className="py-1.5 text-center">{it.quantity} {it.unit}</td>
                          <td className="py-1.5 text-right font-mono">₹{it.unitPrice}</td>
                          <td className="py-1.5 text-right font-mono font-bold">₹{it.lineTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 text-xs font-mono text-right space-y-1">
                    <div>Subtotal: ₹{printDocument.data.subtotal}</div>
                    <div>Discount: -₹{printDocument.data.discountAmount}</div>
                    <div>Tax: +₹{printDocument.data.taxAmount}</div>
                    <div className="text-sm font-bold text-slate-950 pt-1 border-t border-slate-300">
                      Grand Total: ₹{printDocument.data.grandTotal}
                    </div>
                    <div>Amount Paid: ₹{printDocument.data.amountPaid}</div>
                    <div className="font-bold text-red-600">Balance Due: ₹{printDocument.data.balanceDue}</div>
                  </div>
                </div>
              )}

              {printDocument.type === 'PAYMENT' && (
                <div className="py-6 space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-600">Amount Paid:</span>
                    <span className="text-base font-bold font-mono text-slate-950">
                      ₹{printDocument.data.amount}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-600">Payment Mode:</span>
                    <span className="font-bold text-slate-950">{printDocument.data.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-600">Transaction Reference:</span>
                    <span className="font-mono text-slate-950">{printDocument.data.transactionReference || 'N/A'}</span>
                  </div>
                </div>
              )}

              {printDocument.type === 'STATEMENT' && (
                <div className="py-4">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-slate-600">
                        <th className="py-1">Date</th>
                        <th className="py-1">Ref</th>
                        <th className="py-1">Particulars</th>
                        <th className="py-1 text-right">Debit</th>
                        <th className="py-1 text-right">Credit</th>
                        <th className="py-1 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {printDocument.data.entries?.map((e, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-1.5">{formatDate(e.createdAt)}</td>
                          <td className="py-1.5">{e.referenceNumber}</td>
                          <td className="py-1.5 font-sans">{e.description}</td>
                          <td className="py-1.5 text-right text-red-600">
                            {e.direction === 'DEBIT' ? `₹${e.amount}` : '-'}
                          </td>
                          <td className="py-1.5 text-right text-emerald-600">
                            {e.direction === 'CREDIT' ? `₹${e.amount}` : '-'}
                          </td>
                          <td className="py-1.5 text-right font-bold">₹{e.runningBalance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 p-3 bg-slate-50 text-xs font-mono flex justify-between font-bold">
                    <span>Net Balance Owed:</span>
                    <span>₹{Math.abs(printDocument.data.summary?.netBalanceDue || 0)}</span>
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-10 flex justify-between items-end text-xs text-slate-600">
                <div className="border-t border-slate-400 w-36 pt-1 text-center font-medium">
                  Prepared By (Staff)
                </div>
                <div className="border-t border-slate-400 w-36 pt-1 text-center font-medium">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
