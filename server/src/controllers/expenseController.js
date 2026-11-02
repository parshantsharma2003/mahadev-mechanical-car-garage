import mongoose from 'mongoose';
import {
  Expense,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUSES,
  Supplier
} from '../models/index.js';
import { createAuditRecord } from '../services/auditService.js';
import { roundCurrency } from '../utils/supplierCalculations.js';

function escapeRegex(text) {
  return String(text || '').slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sequential unique expense number generator: EXP-YYYYMMDD-XXXX
 */
async function generateExpenseNumber(session = null) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const prefix = `EXP-${yyyy}${mm}${dd}-`;

  const query = Expense.findOne({ expenseNumber: new RegExp(`^${prefix}`) })
    .sort({ expenseNumber: -1 })
    .select('expenseNumber');

  if (session) query.session(session);
  const latest = await query.lean();

  let nextSeq = 1;
  if (latest && latest.expenseNumber) {
    const parts = latest.expenseNumber.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) nextSeq = parsed + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// ==========================================
// 1. LIST EXPENSES (GET /api/v1/expenses)
// ==========================================
export async function listExpenses(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { category, paymentMethod, status, dateFrom, dateTo, search, supplierId } = req.query;
    const filter = {};

    if (category && EXPENSE_CATEGORIES.includes(category.trim().toUpperCase())) {
      filter.category = category.trim().toUpperCase();
    }

    if (paymentMethod && EXPENSE_PAYMENT_METHODS.includes(paymentMethod.trim().toUpperCase())) {
      filter.paymentMethod = paymentMethod.trim().toUpperCase();
    }

    if (status && EXPENSE_STATUSES.includes(status.trim().toUpperCase())) {
      filter.status = status.trim().toUpperCase();
    }

    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
      filter.supplierId = supplierId;
    }

    if (dateFrom || dateTo) {
      filter.expenseDate = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          filter.expenseDate.$gte = fromDate;
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          filter.expenseDate.$lte = toDate;
        }
      }
    }

    if (search && String(search).trim()) {
      const safeSearch = escapeRegex(String(search).trim());
      const regex = new RegExp(safeSearch, 'i');
      filter.$or = [
        { expenseNumber: regex },
        { title: regex },
        { vendorName: regex },
        { receiptReference: regex },
        { description: regex }
      ];
    }

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate('supplierId', 'businessName contactPerson mobileNumber supplierCode')
        .populate('createdBy', 'fullName role')
        .populate('reversedBy', 'fullName role')
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Expense.countDocuments(filter)
    ]);

    // Fast Monthly and Daily Stats
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAgg, monthAgg] = await Promise.all([
      Expense.aggregate([
        { $match: { status: 'RECORDED', expenseDate: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { status: 'RECORDED', expenseDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalToday = todayAgg[0]?.total ? roundCurrency(todayAgg[0].total) : 0;
    const totalThisMonth = monthAgg[0]?.total ? roundCurrency(monthAgg[0].total) : 0;

    return res.status(200).json({
      success: true,
      data: {
        expenses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1
        },
        stats: {
          totalToday,
          totalThisMonth
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 2. CREATE EXPENSE (POST /api/v1/expenses)
// ==========================================
export async function createExpense(req, res, next) {
  try {
    const {
      category,
      title,
      description,
      amount,
      paymentMethod,
      expenseDate,
      vendorName,
      supplierId,
      receiptReference,
      notes
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TITLE', message: 'Expense title is required.' }
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Expense amount must be a valid number greater than zero.' }
      });
    }

    if (!category || !EXPENSE_CATEGORIES.includes(String(category).trim().toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`
        }
      });
    }

    const normalizedPaymentMethod = paymentMethod
      ? String(paymentMethod).trim().toUpperCase()
      : 'CASH';
    if (!EXPENSE_PAYMENT_METHODS.includes(normalizedPaymentMethod)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYMENT_METHOD',
          message: `Payment method must be one of: ${EXPENSE_PAYMENT_METHODS.join(', ')}`
        }
      });
    }

    let linkedSupplierId = null;
    if (supplierId) {
      if (!mongoose.Types.ObjectId.isValid(supplierId)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_SUPPLIER_ID', message: 'Invalid supplier ID format.' }
        });
      }
      const supplierExists = await Supplier.findById(supplierId).select('_id businessName').lean();
      if (!supplierExists) {
        return res.status(404).json({
          success: false,
          error: { code: 'SUPPLIER_NOT_FOUND', message: 'Specified supplier does not exist.' }
        });
      }
      linkedSupplierId = supplierExists._id;
    }

    const expenseNumber = await generateExpenseNumber();

    const expense = new Expense({
      expenseNumber,
      category: String(category).trim().toUpperCase(),
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      amount: roundCurrency(parsedAmount),
      paymentMethod: normalizedPaymentMethod,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      vendorName: vendorName ? String(vendorName).trim() : '',
      supplierId: linkedSupplierId,
      receiptReference: receiptReference ? String(receiptReference).trim() : '',
      notes: notes ? String(notes).trim() : '',
      status: 'RECORDED',
      createdBy: req.user._id
    });

    await expense.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'EXPENSE_CREATED',
      entityType: 'Expense',
      entityId: expense._id,
      diff: {
        before: null,
        after: {
          expenseNumber: expense.expenseNumber,
          category: expense.category,
          amount: expense.amount,
          paymentMethod: expense.paymentMethod
        }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(201).json({
      success: true,
      message: `Expense ${expense.expenseNumber} recorded successfully.`,
      data: expense
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 3. GET EXPENSE BY ID (GET /api/v1/expenses/:id)
// ==========================================
export async function getExpenseById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid expense ID format.' }
      });
    }

    const expense = await Expense.findById(id)
      .populate('supplierId', 'businessName contactPerson mobileNumber supplierCode')
      .populate('createdBy', 'fullName role')
      .populate('reversedBy', 'fullName role');

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { code: 'EXPENSE_NOT_FOUND', message: 'Expense record not found.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: expense
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 4. REVERSE EXPENSE (POST /api/v1/expenses/:id/reverse) [OWNER ONLY]
// ==========================================
export async function reverseExpense(req, res, next) {
  try {
    const { id } = req.params;
    const { reversalReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid expense ID format.' }
      });
    }

    if (!reversalReason || !String(reversalReason).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'REASON_REQUIRED', message: 'Reversal reason is mandatory for expense corrections.' }
      });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { code: 'EXPENSE_NOT_FOUND', message: 'Expense record not found.' }
      });
    }

    if (expense.status === 'REVERSED') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_REVERSED', message: 'Expense is already reversed.' }
      });
    }

    expense.status = 'REVERSED';
    expense.reversedAt = new Date();
    expense.reversedBy = req.user._id;
    expense.reversalReason = String(reversalReason).trim();
    expense.updatedBy = req.user._id;

    await expense.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: 'OWNER',
      actorName: req.user.fullName,
      action: 'EXPENSE_REVERSED',
      entityType: 'Expense',
      entityId: expense._id,
      diff: {
        before: { status: 'RECORDED' },
        after: { status: 'REVERSED', reason: expense.reversalReason }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: `Expense ${expense.expenseNumber} reversed successfully.`,
      data: expense
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 5. EXPENSE STATS & CATEGORY BREAKDOWN (GET /api/v1/expenses/stats)
// ==========================================
export async function getExpenseStats(req, res, next) {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAgg, monthAgg, categoryAgg] = await Promise.all([
      Expense.aggregate([
        { $match: { status: 'RECORDED', expenseDate: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: { status: 'RECORDED', expenseDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: { status: 'RECORDED', expenseDate: { $gte: startOfMonth } } },
        { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { totalAmount: -1 } }
      ])
    ]);

    return res.status(200).json({
      success: true,
      data: {
        today: {
          total: todayAgg[0]?.total ? roundCurrency(todayAgg[0].total) : 0,
          count: todayAgg[0]?.count || 0
        },
        thisMonth: {
          total: monthAgg[0]?.total ? roundCurrency(monthAgg[0].total) : 0,
          count: monthAgg[0]?.count || 0
        },
        categoryBreakdown: categoryAgg.map((c) => ({
          category: c._id,
          totalAmount: roundCurrency(c.totalAmount),
          count: c.count
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}
