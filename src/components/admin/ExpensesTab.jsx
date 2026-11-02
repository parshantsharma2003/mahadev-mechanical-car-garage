import React, { useState, useEffect, useId } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Printer,
  RotateCcw,
  RefreshCw,
  FileText,
  Tag,
  CreditCard,
  Building,
  User,
  X
} from 'lucide-react';
import {
  fetchExpenses,
  fetchExpenseStats,
  createExpense,
  reverseExpense,
  fetchSuppliers
} from '../../utils/api';

const CATEGORIES = [
  'ALL',
  'ELECTRICITY',
  'WATER',
  'RENT',
  'STAFF_SALARY',
  'TEA_FOOD',
  'CLEANING',
  'TOOLS_EQUIPMENT',
  'MACHINE_MAINTENANCE',
  'FUEL_TRANSPORT',
  'INTERNET_PHONE',
  'MARKETING',
  'OFFICE_SUPPLIES',
  'REPAIR_MAINTENANCE',
  'OTHER'
];

const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'];

export default function ExpensesTab({ isOwner }) {
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({ today: { total: 0 }, thisMonth: { total: 0 }, categoryBreakdown: [] });
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    category: 'TEA_FOOD',
    amount: '',
    paymentMethod: 'CASH',
    expenseDate: new Date().toISOString().split('T')[0],
    vendorName: '',
    supplierId: '',
    receiptReference: '',
    notes: '',
    description: ''
  });
  const [reversalReason, setReversalReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        limit: 20,
        search,
        category: selectedCategory === 'ALL' ? '' : selectedCategory,
        paymentMethod: selectedMethod,
        status: selectedStatus,
        dateFrom,
        dateTo
      };

      const [expRes, statsRes, supRes] = await Promise.all([
        fetchExpenses(params),
        fetchExpenseStats().catch(() => ({ data: { today: { total: 0 }, thisMonth: { total: 0 }, categoryBreakdown: [] } })),
        fetchSuppliers({ limit: 100, isActive: true }).catch(() => ({ data: { suppliers: [] } }))
      ]);

      if (expRes.success) {
        setExpenses(expRes.data.expenses || []);
        setPagination(expRes.data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      }

      if (statsRes.data) {
        setStats(statsRes.data);
      }

      if (supRes.data?.suppliers) {
        setSuppliers(supRes.data.suppliers);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
      setError(err.message || 'Error fetching expense records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, selectedCategory, selectedMethod, selectedStatus, dateFrom, dateTo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setSelectedMethod('');
    setSelectedStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Expense title is required.');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Amount must be a valid positive number.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await createExpense({
        ...formData,
        amount: amt
      });
      if (res.success) {
        setSuccessMsg(`Expense ${res.data?.expenseNumber || ''} recorded successfully!`);
        setShowAddModal(false);
        setFormData({
          title: '',
          category: 'TEA_FOOD',
          amount: '',
          paymentMethod: 'CASH',
          expenseDate: new Date().toISOString().split('T')[0],
          vendorName: '',
          supplierId: '',
          receiptReference: '',
          notes: '',
          description: ''
        });
        setTimeout(() => setSuccessMsg(''), 4000);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverseExpense = async (e) => {
    e.preventDefault();
    if (!reversalReason.trim()) {
      setError('Reversal reason is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await reverseExpense(selectedExpense._id, { reversalReason });
      if (res.success) {
        setSuccessMsg(`Expense ${selectedExpense.expenseNumber} reversed successfully.`);
        setShowReverseModal(false);
        setReversalReason('');
        setSelectedExpense(null);
        setTimeout(() => setSuccessMsg(''), 4000);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to reverse expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amt) => {
    return `₹${Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="expenses-tab-content space-y-6">
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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expenses Today</span>
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Calendar size={18} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-white tracking-tight">
            {formatCurrency(stats.today?.total)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {stats.today?.count || 0} transaction{stats.today?.count === 1 ? '' : 's'} recorded today
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expenses This Month</span>
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <DollarSign size={18} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-white tracking-tight">
            {formatCurrency(stats.thisMonth?.total)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {stats.thisMonth?.count || 0} transaction{stats.thisMonth?.count === 1 ? '' : 's'} this month
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Top Monthly Category</span>
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Tag size={18} />
            </span>
          </div>
          <div className="mt-3 text-lg font-bold text-white tracking-tight truncate">
            {stats.categoryBreakdown?.[0]?.category || 'N/A'}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {stats.categoryBreakdown?.[0] ? formatCurrency(stats.categoryBreakdown[0].totalAmount) : '₹0.00'}
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Filtered</span>
            <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <FileText size={18} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-white tracking-tight">
            {pagination.total}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Page {pagination.page} of {pagination.pages}
          </span>
        </div>
      </div>

      {/* Main Operations Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">Daily Workshop Expenses</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Record, inspect, and audit recurring overheads, utilities, and daily operations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700"
              title="Refresh Records"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-orange-950/40"
            >
              <Plus size={16} />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by expense #, title, vendor, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
            />
          </form>

          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <select
            value={selectedMethod}
            onChange={(e) => { setSelectedMethod(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="">All Payment Modes</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="">All Statuses</option>
            <option value="RECORDED">Recorded</option>
            <option value="REVERSED">Reversed</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
            title="Date From"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
            title="Date To"
          />

          {(search || selectedCategory !== 'ALL' || selectedMethod || selectedStatus || dateFrom || dateTo) && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              Reset
            </button>
          )}
        </div>

        {/* Expenses Table */}
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Expense #</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Title & Details</th>
                <th className="py-3 px-4 font-semibold">Payment Mode</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-orange-500" />
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No expense records found matching current criteria.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr
                    key={exp._id}
                    className={`hover:bg-slate-800/30 transition ${
                      exp.status === 'REVERSED' ? 'opacity-65 bg-red-950/10' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                      {exp.expenseNumber}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(exp.expenseDate)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg font-medium border border-slate-700">
                        {exp.category?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{exp.title}</div>
                      {(exp.vendorName || exp.supplierId) && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          Vendor: {exp.supplierId?.businessName || exp.vendorName}
                        </div>
                      )}
                      {exp.receiptReference && (
                        <div className="text-xs text-slate-500">Ref: {exp.receiptReference}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-300 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {exp.status === 'RECORDED' ? (
                        <span className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium">
                          Recorded
                        </span>
                      ) : (
                        <div>
                          <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-full font-medium">
                            Reversed
                          </span>
                          {exp.reversalReason && (
                            <div className="text-[11px] text-red-300/80 mt-1 max-w-[150px] truncate" title={exp.reversalReason}>
                              {exp.reversalReason}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedExpense(exp);
                            setShowPrintModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                          title="Print Expense Voucher"
                        >
                          <Printer size={15} />
                        </button>
                        {isOwner && exp.status === 'RECORDED' && (
                          <button
                            onClick={() => {
                              setSelectedExpense(exp);
                              setShowReverseModal(true);
                            }}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition"
                            title="Reverse Expense (Owner Only)"
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

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {expenses.length} of {pagination.total} records
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

      {/* ======================================================== */}
      {/* MODAL 1: ADD EXPENSE FORM */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-600/10 text-orange-500 rounded-xl">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Record Workshop Expense</h3>
                  <p className="text-xs text-slate-400">Log internal overheads, daily cash spent or bills paid</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Expense Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monthly Electricity Bill / Shop Cleaning Materials"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'ALL').map((cat) => (
                      <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
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
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Vendor / Payee Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MSEDCL / Local Hardware Store"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Linked Supplier (Optional)
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- Direct External Vendor --</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.businessName} ({s.supplierCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Receipt / Bill Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bill #84920 / UTR ID"
                    value={formData.receiptReference}
                    onChange={(e) => setFormData({ ...formData, receiptReference: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Notes / Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Additional context or remarks..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-orange-950/40"
                >
                  {submitting ? 'Saving...' : 'Save Expense Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: REVERSE EXPENSE (OWNER ONLY) */}
      {/* ======================================================== */}
      {showReverseModal && selectedExpense && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="p-2 bg-red-950/40 border border-red-500/20 rounded-xl">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reverse Expense</h3>
                <p className="text-xs text-red-300/80">Owner-authorized audit correction</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mt-2">
              Are you sure you want to reverse expense{' '}
              <strong className="text-white">{selectedExpense.expenseNumber}</strong> for{' '}
              <strong className="text-white">{formatCurrency(selectedExpense.amount)}</strong>?
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Historical records are never silently deleted. A permanent reversal audit event will be logged.
            </p>

            <form onSubmit={handleReverseExpense} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Reversal Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify why this expense is being reversed (e.g. duplicate entry, cancelled service)..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Cancel
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
      {/* MODAL 3: PRINTABLE EXPENSE VOUCHER */}
      {/* ======================================================== */}
      {showPrintModal && selectedExpense && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 no-print">
              <h3 className="text-lg font-bold text-white">Expense Payment Voucher</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-lg transition"
                >
                  <Printer size={14} />
                  <span>Print A4 Voucher</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable A4 Voucher Layout */}
            <div className="printable-voucher-card bg-white text-slate-900 p-8 rounded-xl mt-4 font-sans border border-slate-200">
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
                    Payment Voucher
                  </span>
                  <div className="mt-2 text-xs font-mono font-bold text-slate-800">
                    {selectedExpense.expenseNumber}
                  </div>
                  <div className="text-xs text-slate-500">
                    Date: {formatDate(selectedExpense.expenseDate)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-200">
                <div>
                  <span className="font-semibold text-slate-600">Category:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedExpense.category?.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Payment Mode:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedExpense.paymentMethod}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Paid To / Vendor:</span>{' '}
                  <span className="font-bold text-slate-900">
                    {selectedExpense.supplierId?.businessName || selectedExpense.vendorName || 'Workshop Overhead'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Receipt / Ref #:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedExpense.receiptReference || 'N/A'}</span>
                </div>
              </div>

              <div className="py-6 border-b border-slate-200">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Particulars / Description
                </div>
                <div className="text-sm font-medium text-slate-900">{selectedExpense.title}</div>
                {selectedExpense.notes && (
                  <div className="text-xs text-slate-500 mt-1 italic">{selectedExpense.notes}</div>
                )}
              </div>

              <div className="py-4 flex justify-between items-center bg-slate-50 px-4 rounded-lg my-4">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-700">Total Amount Paid</span>
                <span className="text-xl font-bold font-mono text-slate-950">
                  {formatCurrency(selectedExpense.amount)}
                </span>
              </div>

              <div className="pt-10 flex justify-between items-end text-xs text-slate-600">
                <div>
                  <div className="border-t border-slate-400 w-40 pt-1 text-center font-medium">
                    Prepared By ({selectedExpense.createdBy?.fullName || 'Staff'})
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-40 pt-1 text-center font-medium">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
