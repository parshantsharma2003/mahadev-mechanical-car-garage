import mongoose from 'mongoose';
import {
  Supplier,
  SUPPLIER_CATEGORIES,
  OPENING_BALANCE_DIRECTIONS,
  SupplierPurchase,
  PURCHASE_PAYMENT_STATUSES,
  PURCHASE_STATUSES,
  SupplierPayment,
  SUPPLIER_PAYMENT_METHODS,
  SUPPLIER_PAYMENT_STATUSES,
  SupplierLedgerEntry,
  SUPPLIER_LEDGER_ENTRY_TYPES,
  SUPPLIER_LEDGER_DIRECTIONS
} from '../models/index.js';
import { createAuditRecord } from '../services/auditService.js';
import { roundCurrency, calculatePurchaseTotals } from '../utils/supplierCalculations.js';
import { isTransactionSupported } from '../config/db.js';

function escapeRegex(text) {
  return String(text || '').slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sequential unique supplier code generator: SUP-XXXX
 */
async function generateSupplierCode(session = null) {
  const query = Supplier.find({ supplierCode: /^SUP-\d+$/ })
    .sort({ supplierCode: -1 })
    .limit(1)
    .select('supplierCode');

  if (session) query.session(session);
  const latestList = await query.lean();
  const latest = latestList[0];

  let nextSeq = 1;
  if (latest && latest.supplierCode) {
    const match = latest.supplierCode.match(/\d+$/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (!isNaN(parsed)) nextSeq = parsed + 1;
    }
  }

  return `SUP-${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Sequential unique purchase number generator: PUR-YYYYMMDD-XXXX
 */
async function generatePurchaseNumber(session = null) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const prefix = `PUR-${yyyy}${mm}${dd}-`;

  const query = SupplierPurchase.findOne({ purchaseNumber: new RegExp(`^${prefix}`) })
    .sort({ purchaseNumber: -1 })
    .select('purchaseNumber');

  if (session) query.session(session);
  const latest = await query.lean();

  let nextSeq = 1;
  if (latest && latest.purchaseNumber) {
    const parts = latest.purchaseNumber.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) nextSeq = parsed + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Sequential unique supplier payment reference generator: SPAY-YYYYMMDD-XXXX
 */
async function generateSupplierPaymentReference(session = null) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const prefix = `SPAY-${yyyy}${mm}${dd}-`;

  const query = SupplierPayment.findOne({ paymentReference: new RegExp(`^${prefix}`) })
    .sort({ paymentReference: -1 })
    .select('paymentReference');

  if (session) query.session(session);
  const latest = await query.lean();

  let nextSeq = 1;
  if (latest && latest.paymentReference) {
    const parts = latest.paymentReference.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) nextSeq = parsed + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Helper to compute a supplier's net ledger balance: sum(DEBIT) - sum(CREDIT)
 */
async function calculateSupplierLedgerBalance(supplierId, session = null) {
  const query = SupplierLedgerEntry.aggregate([
    { $match: { supplierId: new mongoose.Types.ObjectId(supplierId) } },
    {
      $group: {
        _id: '$direction',
        total: { $sum: '$amount' }
      }
    }
  ]);

  if (session) query.session(session);
  const res = await query;

  let totalDebit = 0;
  let totalCredit = 0;

  res.forEach((group) => {
    if (group._id === 'DEBIT') totalDebit = roundCurrency(group.total);
    if (group._id === 'CREDIT') totalCredit = roundCurrency(group.total);
  });

  const netBalanceDue = roundCurrency(totalDebit - totalCredit);
  return { totalDebit, totalCredit, netBalanceDue };
}

// =========================================================================
// SECTION 1: SUPPLIERS DIRECTORY & CRUD
// =========================================================================

// GET /api/v1/suppliers
export async function listSuppliers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { search, category, isActive } = req.query;
    const filter = {};

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = String(isActive) === 'true';
    }

    if (category && SUPPLIER_CATEGORIES.includes(category.trim().toUpperCase())) {
      filter.supplierCategory = category.trim().toUpperCase();
    }

    if (search && String(search).trim()) {
      const safeSearch = escapeRegex(String(search).trim());
      const regex = new RegExp(safeSearch, 'i');
      filter.$or = [
        { supplierCode: regex },
        { businessName: regex },
        { contactPerson: regex },
        { mobileNumber: regex },
        { city: regex }
      ];
    }

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter)
        .sort({ businessName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Supplier.countDocuments(filter)
    ]);

    // Attach real-time ledger balance and unpaid purchases count for each supplier
    const supplierIds = suppliers.map((s) => s._id);

    const [ledgerAgg, purchasesAgg] = await Promise.all([
      SupplierLedgerEntry.aggregate([
        { $match: { supplierId: { $in: supplierIds } } },
        {
          $group: {
            _id: { supplierId: '$supplierId', direction: '$direction' },
            total: { $sum: '$amount' }
          }
        }
      ]),
      SupplierPurchase.aggregate([
        {
          $match: {
            supplierId: { $in: supplierIds },
            purchaseStatus: 'RECORDED',
            paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID'] }
          }
        },
        {
          $group: {
            _id: '$supplierId',
            unpaidCount: { $sum: 1 },
            unpaidBalanceSum: { $sum: '$balanceDue' }
          }
        }
      ])
    ]);

    const balanceMap = {};
    ledgerAgg.forEach((item) => {
      const sId = String(item._id.supplierId);
      if (!balanceMap[sId]) balanceMap[sId] = { debit: 0, credit: 0 };
      if (item._id.direction === 'DEBIT') balanceMap[sId].debit = item.total;
      if (item._id.direction === 'CREDIT') balanceMap[sId].credit = item.total;
    });

    const unpaidMap = {};
    purchasesAgg.forEach((p) => {
      unpaidMap[String(p._id)] = {
        unpaidCount: p.unpaidCount,
        unpaidBalanceSum: roundCurrency(p.unpaidBalanceSum)
      };
    });

    const enrichedSuppliers = suppliers.map((s) => {
      const sId = String(s._id);
      const debit = balanceMap[sId]?.debit || 0;
      const credit = balanceMap[sId]?.credit || 0;
      const outstandingBalance = roundCurrency(debit - credit);

      return {
        ...s,
        outstandingBalance,
        balanceDirection:
          outstandingBalance > 0
            ? 'GARAGE_OWES'
            : outstandingBalance < 0
            ? 'SUPPLIER_CREDIT'
            : 'BALANCED',
        unpaidPurchasesCount: unpaidMap[sId]?.unpaidCount || 0,
        unpaidPurchasesBalance: unpaidMap[sId]?.unpaidBalanceSum || 0
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        suppliers: enrichedSuppliers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/suppliers
export async function createSupplier(req, res, next) {
  try {
    const {
      businessName,
      contactPerson,
      mobileNumber,
      alternateMobileNumber,
      email,
      address,
      city,
      state,
      supplierCategory,
      notes,
      openingBalance,
      openingBalanceDirection
    } = req.body;

    if (!businessName || !String(businessName).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_NAME', message: 'Business name is required.' }
      });
    }

    if (!contactPerson || !String(contactPerson).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CONTACT_PERSON', message: 'Contact person is required.' }
      });
    }

    if (!mobileNumber || !String(mobileNumber).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_MOBILE', message: 'Mobile number is required.' }
      });
    }

    // Duplicate check
    const existing = await Supplier.findOne({
      $or: [
        { businessName: new RegExp(`^${escapeRegex(String(businessName).trim())}$`, 'i') },
        { mobileNumber: String(mobileNumber).trim() }
      ]
    }).lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_SUPPLIER',
          message: `A supplier with the same business name or mobile number already exists (${existing.supplierCode}).`
        }
      });
    }

    const normalizedCategory = supplierCategory && SUPPLIER_CATEGORIES.includes(String(supplierCategory).trim().toUpperCase())
      ? String(supplierCategory).trim().toUpperCase()
      : 'SPARE_PARTS';

    const parsedOpeningBalance = Number(openingBalance) || 0;
    if (parsedOpeningBalance < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_OPENING_BALANCE', message: 'Opening balance cannot be negative.' }
      });
    }

    const normalizedOpeningDirection = openingBalanceDirection && OPENING_BALANCE_DIRECTIONS.includes(String(openingBalanceDirection).trim().toUpperCase())
      ? String(openingBalanceDirection).trim().toUpperCase()
      : 'OPENING_PAYABLE';

    const supplierCode = await generateSupplierCode();

    const supplier = new Supplier({
      supplierCode,
      businessName: String(businessName).trim(),
      contactPerson: String(contactPerson).trim(),
      mobileNumber: String(mobileNumber).trim(),
      alternateMobileNumber: alternateMobileNumber ? String(alternateMobileNumber).trim() : '',
      email: email ? String(email).trim().toLowerCase() : '',
      address: address ? String(address).trim() : '',
      city: city ? String(city).trim() : 'Pune',
      state: state ? String(state).trim() : 'Maharashtra',
      supplierCategory: normalizedCategory,
      notes: notes ? String(notes).trim() : '',
      openingBalance: roundCurrency(parsedOpeningBalance),
      openingBalanceDirection: normalizedOpeningDirection,
      isActive: true,
      createdBy: req.user._id
    });

    await supplier.save();

    // If opening balance > 0, post initial ledger entry
    if (parsedOpeningBalance > 0) {
      const isPayable = normalizedOpeningDirection === 'OPENING_PAYABLE';
      const initialEntry = new SupplierLedgerEntry({
        supplierId: supplier._id,
        entryType: 'OPENING_BALANCE',
        direction: isPayable ? 'DEBIT' : 'CREDIT',
        amount: roundCurrency(parsedOpeningBalance),
        sourceType: 'OPENING_BALANCE',
        sourceId: supplier._id,
        referenceNumber: `OP-${supplier.supplierCode}`,
        description: `Opening balance (${isPayable ? 'Garage owes supplier' : 'Supplier owes/credited garage'})`,
        balanceAfter: isPayable ? roundCurrency(parsedOpeningBalance) : -roundCurrency(parsedOpeningBalance),
        createdBy: req.user._id
      });
      await initialEntry.save();
    }

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'SUPPLIER_CREATED',
      entityType: 'Supplier',
      entityId: supplier._id,
      diff: {
        before: null,
        after: {
          supplierCode: supplier.supplierCode,
          businessName: supplier.businessName,
          openingBalance: supplier.openingBalance,
          openingBalanceDirection: supplier.openingBalanceDirection
        }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(201).json({
      success: true,
      message: `Supplier ${supplier.businessName} (${supplier.supplierCode}) registered successfully.`,
      data: supplier
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/suppliers/:id
export async function getSupplierById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid supplier ID format.' }
      });
    }

    const supplier = await Supplier.findById(id).lean();
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found.' }
      });
    }

    const [ledgerSummary, purchasesAgg, paymentsAgg, lastPurchase, lastPayment] = await Promise.all([
      calculateSupplierLedgerBalance(supplier._id),
      SupplierPurchase.aggregate([
        { $match: { supplierId: new mongoose.Types.ObjectId(id), purchaseStatus: { $ne: 'CANCELLED' } } },
        {
          $group: {
            _id: null,
            totalPurchases: { $sum: '$grandTotal' },
            unpaidCount: {
              $sum: { $cond: [{ $in: ['$paymentStatus', ['UNPAID', 'PARTIALLY_PAID']] }, 1, 0] }
            }
          }
        }
      ]),
      SupplierPayment.aggregate([
        { $match: { supplierId: new mongoose.Types.ObjectId(id) } },
        {
          $group: {
            _id: '$status',
            total: { $sum: '$amount' }
          }
        }
      ]),
      SupplierPurchase.findOne({ supplierId: id, purchaseStatus: { $ne: 'CANCELLED' } })
        .sort({ purchaseDate: -1 })
        .select('purchaseDate purchaseNumber')
        .lean(),
      SupplierPayment.findOne({ supplierId: id, status: 'COMPLETED' })
        .sort({ paymentDate: -1 })
        .select('paymentDate paymentReference')
        .lean()
    ]);

    let totalPayments = 0;
    let totalReversals = 0;
    paymentsAgg.forEach((item) => {
      if (item._id === 'COMPLETED') totalPayments = roundCurrency(item.total);
      if (item._id === 'REVERSED') totalReversals = roundCurrency(item.total);
    });

    const summary = {
      openingBalance: supplier.openingBalance,
      openingBalanceDirection: supplier.openingBalanceDirection,
      totalPurchases: purchasesAgg[0]?.totalPurchases ? roundCurrency(purchasesAgg[0].totalPurchases) : 0,
      totalPayments,
      totalReversals,
      currentOutstandingBalance: ledgerSummary.netBalanceDue,
      balanceDirection:
        ledgerSummary.netBalanceDue > 0
          ? 'GARAGE_OWES'
          : ledgerSummary.netBalanceDue < 0
          ? 'SUPPLIER_CREDIT'
          : 'BALANCED',
      unpaidPurchasesCount: purchasesAgg[0]?.unpaidCount || 0,
      lastPurchaseDate: lastPurchase?.purchaseDate || null,
      lastPaymentDate: lastPayment?.paymentDate || null
    };

    return res.status(200).json({
      success: true,
      data: {
        supplier,
        summary
      }
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/suppliers/:id
export async function updateSupplier(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid supplier ID format.' }
      });
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found.' }
      });
    }

    const {
      businessName,
      contactPerson,
      mobileNumber,
      alternateMobileNumber,
      email,
      address,
      city,
      state,
      supplierCategory,
      notes
    } = req.body;

    const previousSnapshot = {
      businessName: supplier.businessName,
      contactPerson: supplier.contactPerson,
      mobileNumber: supplier.mobileNumber,
      supplierCategory: supplier.supplierCategory
    };

    if (businessName) supplier.businessName = String(businessName).trim();
    if (contactPerson) supplier.contactPerson = String(contactPerson).trim();
    if (mobileNumber) supplier.mobileNumber = String(mobileNumber).trim();
    if (alternateMobileNumber !== undefined) supplier.alternateMobileNumber = String(alternateMobileNumber).trim();
    if (email !== undefined) supplier.email = String(email).trim().toLowerCase();
    if (address !== undefined) supplier.address = String(address).trim();
    if (city !== undefined) supplier.city = String(city).trim();
    if (state !== undefined) supplier.state = String(state).trim();
    if (supplierCategory && SUPPLIER_CATEGORIES.includes(String(supplierCategory).trim().toUpperCase())) {
      supplier.supplierCategory = String(supplierCategory).trim().toUpperCase();
    }
    if (notes !== undefined) supplier.notes = String(notes).trim();

    supplier.updatedBy = req.user._id;
    await supplier.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'SUPPLIER_UPDATED',
      entityType: 'Supplier',
      entityId: supplier._id,
      diff: {
        before: previousSnapshot,
        after: {
          businessName: supplier.businessName,
          contactPerson: supplier.contactPerson,
          mobileNumber: supplier.mobileNumber,
          supplierCategory: supplier.supplierCategory
        }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: 'Supplier details updated successfully.',
      data: supplier
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/suppliers/:id/status
export async function toggleSupplierStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid supplier ID format.' }
      });
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found.' }
      });
    }

    const previousStatus = supplier.isActive;
    supplier.isActive = !previousStatus;
    supplier.updatedBy = req.user._id;
    await supplier.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'SUPPLIER_STATUS_CHANGED',
      entityType: 'Supplier',
      entityId: supplier._id,
      diff: {
        before: { isActive: previousStatus },
        after: { isActive: supplier.isActive }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: `Supplier ${supplier.businessName} marked as ${supplier.isActive ? 'Active' : 'Inactive'}.`,
      data: supplier
    });
  } catch (err) {
    next(err);
  }
}

// =========================================================================
// SECTION 2: SUPPLIER PURCHASES
// =========================================================================

// GET /api/v1/supplier-purchases
export async function listSupplierPurchases(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { supplierId, paymentStatus, purchaseStatus, dateFrom, dateTo, search } = req.query;
    const filter = {};

    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
      filter.supplierId = supplierId;
    }

    if (paymentStatus && PURCHASE_PAYMENT_STATUSES.includes(paymentStatus.trim().toUpperCase())) {
      filter.paymentStatus = paymentStatus.trim().toUpperCase();
    }

    if (purchaseStatus && PURCHASE_STATUSES.includes(purchaseStatus.trim().toUpperCase())) {
      filter.purchaseStatus = purchaseStatus.trim().toUpperCase();
    }

    if (dateFrom || dateTo) {
      filter.purchaseDate = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          filter.purchaseDate.$gte = fromDate;
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          filter.purchaseDate.$lte = toDate;
        }
      }
    }

    if (search && String(search).trim()) {
      const safeSearch = escapeRegex(String(search).trim());
      const regex = new RegExp(safeSearch, 'i');
      filter.$or = [
        { purchaseNumber: regex },
        { supplierInvoiceNumber: regex },
        { 'supplierSnapshot.businessName': regex }
      ];
    }

    const [purchases, total] = await Promise.all([
      SupplierPurchase.find(filter)
        .populate('supplierId', 'businessName contactPerson mobileNumber supplierCode')
        .populate('createdBy', 'fullName role')
        .sort({ purchaseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupplierPurchase.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        purchases,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/supplier-purchases
export async function createSupplierPurchase(req, res, next) {
  try {
    const {
      supplierId,
      supplierInvoiceNumber,
      purchaseDate,
      items,
      discountAmount,
      taxAmount,
      amountPaid,
      paymentMethod,
      transactionReference,
      notes,
      purchaseStatus = 'RECORDED'
    } = req.body;

    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SUPPLIER_ID', message: 'Valid supplier ID is required.' }
      });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found.' }
      });
    }

    if (!supplier.isActive) {
      return res.status(400).json({
        success: false,
        error: { code: 'SUPPLIER_INACTIVE', message: 'Cannot record purchase for an inactive supplier.' }
      });
    }

    // Check duplicate supplier invoice reference if provided
    if (supplierInvoiceNumber && String(supplierInvoiceNumber).trim()) {
      const duplicateInvoice = await SupplierPurchase.findOne({
        supplierId,
        supplierInvoiceNumber: String(supplierInvoiceNumber).trim(),
        purchaseStatus: { $ne: 'CANCELLED' }
      }).lean();

      if (duplicateInvoice) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_SUPPLIER_INVOICE',
            message: `A purchase with supplier invoice "${supplierInvoiceNumber}" already exists for this supplier.`
          }
        });
      }
    }

    // Calculate totals on the backend
    const calculated = calculatePurchaseTotals(items, discountAmount, taxAmount);

    const parsedPaid = Number(amountPaid) || 0;
    if (parsedPaid < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT_PAID', message: 'Amount paid cannot be negative.' }
      });
    }
    if (parsedPaid > calculated.grandTotal) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OVERPAYMENT_NOT_ALLOWED',
          message: `Amount paid (₹${parsedPaid}) cannot exceed purchase grand total (₹${calculated.grandTotal}).`
        }
      });
    }

    const initialPaid = roundCurrency(parsedPaid);
    const balanceDue = roundCurrency(calculated.grandTotal - initialPaid);

    let paymentStatus = 'UNPAID';
    if (initialPaid >= calculated.grandTotal && calculated.grandTotal > 0) {
      paymentStatus = 'PAID';
    } else if (initialPaid > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    const normalizedPurchaseStatus = purchaseStatus === 'DRAFT' ? 'DRAFT' : 'RECORDED';
    const purchaseNumber = await generatePurchaseNumber();

    const purchase = new SupplierPurchase({
      purchaseNumber,
      supplierId: supplier._id,
      supplierSnapshot: {
        businessName: supplier.businessName,
        contactPerson: supplier.contactPerson,
        mobileNumber: supplier.mobileNumber,
        supplierCode: supplier.supplierCode
      },
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      supplierInvoiceNumber: supplierInvoiceNumber ? String(supplierInvoiceNumber).trim() : '',
      items: calculated.items,
      subtotal: calculated.subtotal,
      discountAmount: calculated.discountAmount,
      taxAmount: calculated.taxAmount,
      grandTotal: calculated.grandTotal,
      amountPaid: initialPaid,
      balanceDue,
      paymentStatus,
      purchaseStatus: normalizedPurchaseStatus,
      notes: notes ? String(notes).trim() : '',
      createdBy: req.user._id
    });

    const isTxn = await isTransactionSupported();

    if (isTxn) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await purchase.save({ session });

          // If RECORDED, post DEBIT entry in supplier ledger
          if (normalizedPurchaseStatus === 'RECORDED') {
            const purchaseDebit = new SupplierLedgerEntry({
              supplierId: supplier._id,
              entryType: 'PURCHASE',
              direction: 'DEBIT',
              amount: purchase.grandTotal,
              sourceType: 'PURCHASE',
              sourceId: purchase._id,
              referenceNumber: purchase.purchaseNumber,
              description: `Purchase ${purchase.purchaseNumber}${purchase.supplierInvoiceNumber ? ` (Inv: ${purchase.supplierInvoiceNumber})` : ''}`,
              createdBy: req.user._id
            });
            await purchaseDebit.save({ session });

            // If immediate initial payment was recorded
            if (initialPaid > 0) {
              const paymentRef = await generateSupplierPaymentReference(session);
              const payment = new SupplierPayment({
                paymentReference: paymentRef,
                supplierId: supplier._id,
                purchaseId: purchase._id,
                amount: initialPaid,
                paymentMethod: paymentMethod && SUPPLIER_PAYMENT_METHODS.includes(String(paymentMethod).toUpperCase())
                  ? String(paymentMethod).toUpperCase()
                  : 'CASH',
                paymentDate: purchase.purchaseDate,
                transactionReference: transactionReference ? String(transactionReference).trim() : '',
                notes: `Initial payment at purchase creation (${purchase.purchaseNumber})`,
                receivedBy: req.user._id,
                status: 'COMPLETED'
              });
              await payment.save({ session });

              const paymentCredit = new SupplierLedgerEntry({
                supplierId: supplier._id,
                entryType: 'PAYMENT',
                direction: 'CREDIT',
                amount: initialPaid,
                sourceType: 'PAYMENT',
                sourceId: payment._id,
                referenceNumber: paymentRef,
                description: `Payment for purchase ${purchase.purchaseNumber}`,
                createdBy: req.user._id
              });
              await paymentCredit.save({ session });
            }
          }

          await createAuditRecord({
            actorId: req.user._id,
            actorRole: req.user.role,
            actorName: req.user.fullName,
            action: 'PURCHASE_CREATED',
            entityType: 'SupplierPurchase',
            entityId: purchase._id,
            diff: {
              before: null,
              after: {
                purchaseNumber: purchase.purchaseNumber,
                supplierName: supplier.businessName,
                grandTotal: purchase.grandTotal,
                amountPaid: initialPaid,
                balanceDue
              }
            },
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.headers['user-agent'] || 'admin-api'
          });
        });
      } finally {
        await session.endSession();
      }
    } else {
      await purchase.save();

      if (normalizedPurchaseStatus === 'RECORDED') {
        const purchaseDebit = new SupplierLedgerEntry({
          supplierId: supplier._id,
          entryType: 'PURCHASE',
          direction: 'DEBIT',
          amount: purchase.grandTotal,
          sourceType: 'PURCHASE',
          sourceId: purchase._id,
          referenceNumber: purchase.purchaseNumber,
          description: `Purchase ${purchase.purchaseNumber}${purchase.supplierInvoiceNumber ? ` (Inv: ${purchase.supplierInvoiceNumber})` : ''}`,
          createdBy: req.user._id
        });
        await purchaseDebit.save();

        if (initialPaid > 0) {
          const paymentRef = await generateSupplierPaymentReference();
          const payment = new SupplierPayment({
            paymentReference: paymentRef,
            supplierId: supplier._id,
            purchaseId: purchase._id,
            amount: initialPaid,
            paymentMethod: paymentMethod && SUPPLIER_PAYMENT_METHODS.includes(String(paymentMethod).toUpperCase())
              ? String(paymentMethod).toUpperCase()
              : 'CASH',
            paymentDate: purchase.purchaseDate,
            transactionReference: transactionReference ? String(transactionReference).trim() : '',
            notes: `Initial payment at purchase creation (${purchase.purchaseNumber})`,
            receivedBy: req.user._id,
            status: 'COMPLETED'
          });
          await payment.save();

          const paymentCredit = new SupplierLedgerEntry({
            supplierId: supplier._id,
            entryType: 'PAYMENT',
            direction: 'CREDIT',
            amount: initialPaid,
            sourceType: 'PAYMENT',
            sourceId: payment._id,
            referenceNumber: paymentRef,
            description: `Payment for purchase ${purchase.purchaseNumber}`,
            createdBy: req.user._id
          });
          await paymentCredit.save();
        }
      }

      await createAuditRecord({
        actorId: req.user._id,
        actorRole: req.user.role,
        actorName: req.user.fullName,
        action: 'PURCHASE_CREATED',
        entityType: 'SupplierPurchase',
        entityId: purchase._id,
        diff: {
          before: null,
          after: {
            purchaseNumber: purchase.purchaseNumber,
            supplierName: supplier.businessName,
            grandTotal: purchase.grandTotal,
            amountPaid: initialPaid,
            balanceDue
          }
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-api'
      });
    }

    return res.status(201).json({
      success: true,
      message: `Purchase ${purchase.purchaseNumber} recorded successfully.`,
      data: purchase
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/supplier-purchases/:id
export async function getSupplierPurchaseById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid purchase ID format.' }
      });
    }

    const [purchase, payments] = await Promise.all([
      SupplierPurchase.findById(id)
        .populate('supplierId', 'businessName contactPerson mobileNumber supplierCode')
        .populate('createdBy', 'fullName role')
        .lean(),
      SupplierPayment.find({ purchaseId: id })
        .populate('receivedBy', 'fullName role')
        .sort({ paymentDate: -1 })
        .lean()
    ]);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: { code: 'PURCHASE_NOT_FOUND', message: 'Purchase record not found.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...purchase,
        payments
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/supplier-purchases/:id/record
export async function recordDraftPurchase(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid purchase ID format.' }
      });
    }

    const purchase = await SupplierPurchase.findById(id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: { code: 'PURCHASE_NOT_FOUND', message: 'Purchase not found.' }
      });
    }

    if (purchase.purchaseStatus === 'RECORDED') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_RECORDED', message: 'Purchase is already recorded.' }
      });
    }

    if (purchase.purchaseStatus === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: { code: 'PURCHASE_CANCELLED', message: 'Cannot record a cancelled purchase.' }
      });
    }

    purchase.purchaseStatus = 'RECORDED';
    purchase.updatedBy = req.user._id;

    const purchaseDebit = new SupplierLedgerEntry({
      supplierId: purchase.supplierId,
      entryType: 'PURCHASE',
      direction: 'DEBIT',
      amount: purchase.grandTotal,
      sourceType: 'PURCHASE',
      sourceId: purchase._id,
      referenceNumber: purchase.purchaseNumber,
      description: `Purchase ${purchase.purchaseNumber} recorded`,
      createdBy: req.user._id
    });

    await purchase.save();
    await purchaseDebit.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'PURCHASE_RECORDED',
      entityType: 'SupplierPurchase',
      entityId: purchase._id,
      diff: {
        before: { purchaseStatus: 'DRAFT' },
        after: { purchaseStatus: 'RECORDED' }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: `Purchase ${purchase.purchaseNumber} recorded into supplier ledger.`,
      data: purchase
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/supplier-purchases/:id/cancel [OWNER ONLY]
export async function cancelSupplierPurchase(req, res, next) {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid purchase ID format.' }
      });
    }

    if (!cancellationReason || !String(cancellationReason).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'REASON_REQUIRED', message: 'Cancellation reason is mandatory.' }
      });
    }

    const purchase = await SupplierPurchase.findById(id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: { code: 'PURCHASE_NOT_FOUND', message: 'Purchase not found.' }
      });
    }

    if (purchase.purchaseStatus === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CANCELLED', message: 'Purchase is already cancelled.' }
      });
    }

    // Check active payments linked to this purchase
    const activePayments = await SupplierPayment.find({
      purchaseId: id,
      status: 'COMPLETED'
    }).lean();

    if (activePayments.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENTS_EXIST',
          message: 'Cannot cancel purchase with active completed payments. Reverse all linked payments first.'
        }
      });
    }

    const previousStatus = purchase.purchaseStatus;
    purchase.purchaseStatus = 'CANCELLED';
    purchase.cancelledAt = new Date();
    purchase.cancelledBy = req.user._id;
    purchase.cancellationReason = String(cancellationReason).trim();
    purchase.updatedBy = req.user._id;

    const isTxn = await isTransactionSupported();

    if (isTxn) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await purchase.save({ session });

          // If was RECORDED, post neutralizing CREDIT in supplier ledger
          if (previousStatus === 'RECORDED') {
            const reversalCredit = new SupplierLedgerEntry({
              supplierId: purchase.supplierId,
              entryType: 'PURCHASE_REVERSAL',
              direction: 'CREDIT',
              amount: purchase.grandTotal,
              sourceType: 'PURCHASE',
              sourceId: purchase._id,
              referenceNumber: `CANCEL-${purchase.purchaseNumber}`,
              description: `Purchase ${purchase.purchaseNumber} cancelled by OWNER: ${String(cancellationReason).trim()}`,
              createdBy: req.user._id
            });
            await reversalCredit.save({ session });
          }

          await createAuditRecord({
            actorId: req.user._id,
            actorRole: 'OWNER',
            actorName: req.user.fullName,
            action: 'PURCHASE_CANCELLED',
            entityType: 'SupplierPurchase',
            entityId: purchase._id,
            diff: {
              before: { purchaseStatus: previousStatus },
              after: { purchaseStatus: 'CANCELLED', reason: String(cancellationReason).trim() }
            },
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.headers['user-agent'] || 'admin-api'
          });
        });
      } finally {
        await session.endSession();
      }
    } else {
      await purchase.save();

      if (previousStatus === 'RECORDED') {
        const reversalCredit = new SupplierLedgerEntry({
          supplierId: purchase.supplierId,
          entryType: 'PURCHASE_REVERSAL',
          direction: 'CREDIT',
          amount: purchase.grandTotal,
          sourceType: 'PURCHASE',
          sourceId: purchase._id,
          referenceNumber: `CANCEL-${purchase.purchaseNumber}`,
          description: `Purchase ${purchase.purchaseNumber} cancelled by OWNER: ${String(cancellationReason).trim()}`,
          createdBy: req.user._id
        });
        await reversalCredit.save();
      }

      await createAuditRecord({
        actorId: req.user._id,
        actorRole: 'OWNER',
        actorName: req.user.fullName,
        action: 'PURCHASE_CANCELLED',
        entityType: 'SupplierPurchase',
        entityId: purchase._id,
        diff: {
          before: { purchaseStatus: previousStatus },
          after: { purchaseStatus: 'CANCELLED', reason: String(cancellationReason).trim() }
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-api'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Purchase ${purchase.purchaseNumber} cancelled successfully.`,
      data: purchase
    });
  } catch (err) {
    next(err);
  }
}

// =========================================================================
// SECTION 3: SUPPLIER PAYMENTS
// =========================================================================

// GET /api/v1/suppliers/:id/payments
export async function listSupplierPayments(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid supplier ID format.' }
      });
    }

    const { purchaseId, status } = req.query;
    const filter = { supplierId: id };

    if (purchaseId && mongoose.Types.ObjectId.isValid(purchaseId)) {
      filter.purchaseId = purchaseId;
    }

    if (status && SUPPLIER_PAYMENT_STATUSES.includes(status.trim().toUpperCase())) {
      filter.status = status.trim().toUpperCase();
    }

    const payments = await SupplierPayment.find(filter)
      .populate('receivedBy', 'fullName role')
      .populate('reversedBy', 'fullName role')
      .populate('purchaseId', 'purchaseNumber supplierInvoiceNumber grandTotal')
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: payments
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/suppliers/:id/payments
export async function recordSupplierPayment(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid supplier ID format.' }
      });
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found.' }
      });
    }

    const {
      amount,
      paymentMethod,
      paymentDate,
      transactionReference,
      notes,
      purchaseId
    } = req.body;

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Payment amount must be greater than zero.' }
      });
    }
    const paymentAmount = roundCurrency(parsedAmount);

    const normalizedMethod = paymentMethod && SUPPLIER_PAYMENT_METHODS.includes(String(paymentMethod).trim().toUpperCase())
      ? String(paymentMethod).trim().toUpperCase()
      : 'CASH';

    let linkedPurchase = null;
    if (purchaseId) {
      if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PURCHASE_ID', message: 'Invalid purchase ID format.' }
        });
      }

      linkedPurchase = await SupplierPurchase.findOne({
        _id: purchaseId,
        supplierId: supplier._id
      });

      if (!linkedPurchase) {
        return res.status(404).json({
          success: false,
          error: { code: 'PURCHASE_NOT_FOUND', message: 'Purchase not found for this supplier.' }
        });
      }

      if (linkedPurchase.purchaseStatus === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          error: { code: 'PURCHASE_CANCELLED', message: 'Cannot record payment against a cancelled purchase.' }
        });
      }

      if (paymentAmount > linkedPurchase.balanceDue) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EXCEEDS_BALANCE_DUE',
            message: `Payment amount (₹${paymentAmount}) exceeds purchase balance due (₹${linkedPurchase.balanceDue}).`
          }
        });
      }
    } else {
      // General payment: check supplier net balance
      const ledgerSummary = await calculateSupplierLedgerBalance(supplier._id);
      if (ledgerSummary.netBalanceDue <= 0 && paymentAmount > 0) {
        // Supplier is already balanced or has credit
        const isAdvanceAllowed = req.body.allowAdvance === true;
        if (!isAdvanceAllowed) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'OVERPAYMENT_EXCEEDS_BALANCE',
              message: `Supplier has no outstanding balance (current due: ₹${ledgerSummary.netBalanceDue}). Pass allowAdvance: true to record supplier advance payment.`
            }
          });
        }
      }
    }

    const paymentReference = await generateSupplierPaymentReference();

    const payment = new SupplierPayment({
      paymentReference,
      supplierId: supplier._id,
      purchaseId: linkedPurchase ? linkedPurchase._id : null,
      amount: paymentAmount,
      paymentMethod: normalizedMethod,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      transactionReference: transactionReference ? String(transactionReference).trim() : '',
      notes: notes ? String(notes).trim() : '',
      receivedBy: req.user._id,
      status: 'COMPLETED'
    });

    const isTxn = await isTransactionSupported();

    if (isTxn) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await payment.save({ session });

          // Update linked purchase balance if specific
          if (linkedPurchase) {
            linkedPurchase.amountPaid = roundCurrency(linkedPurchase.amountPaid + paymentAmount);
            linkedPurchase.balanceDue = roundCurrency(Math.max(0, linkedPurchase.grandTotal - linkedPurchase.amountPaid));
            linkedPurchase.paymentStatus =
              linkedPurchase.balanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
            linkedPurchase.updatedBy = req.user._id;
            await linkedPurchase.save({ session });
          }

          // Post CREDIT in supplier ledger (reduces garage debt to supplier)
          const ledgerEntry = new SupplierLedgerEntry({
            supplierId: supplier._id,
            entryType: 'PAYMENT',
            direction: 'CREDIT',
            amount: paymentAmount,
            sourceType: 'PAYMENT',
            sourceId: payment._id,
            referenceNumber: paymentReference,
            description: linkedPurchase
              ? `Payment for purchase ${linkedPurchase.purchaseNumber}`
              : `Payment to ${supplier.businessName}`,
            createdBy: req.user._id
          });
          await ledgerEntry.save({ session });

          await createAuditRecord({
            actorId: req.user._id,
            actorRole: req.user.role,
            actorName: req.user.fullName,
            action: 'SUPPLIER_PAYMENT_RECORDED',
            entityType: 'SupplierPayment',
            entityId: payment._id,
            diff: {
              before: null,
              after: {
                paymentReference,
                supplierName: supplier.businessName,
                amount: paymentAmount,
                paymentMethod: normalizedMethod,
                purchaseNumber: linkedPurchase?.purchaseNumber || 'GENERAL_ACCOUNT'
              }
            },
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.headers['user-agent'] || 'admin-api'
          });
        });
      } finally {
        await session.endSession();
      }
    } else {
      await payment.save();

      if (linkedPurchase) {
        linkedPurchase.amountPaid = roundCurrency(linkedPurchase.amountPaid + paymentAmount);
        linkedPurchase.balanceDue = roundCurrency(Math.max(0, linkedPurchase.grandTotal - linkedPurchase.amountPaid));
        linkedPurchase.paymentStatus =
          linkedPurchase.balanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
        linkedPurchase.updatedBy = req.user._id;
        await linkedPurchase.save();
      }

      const ledgerEntry = new SupplierLedgerEntry({
        supplierId: supplier._id,
        entryType: 'PAYMENT',
        direction: 'CREDIT',
        amount: paymentAmount,
        sourceType: 'PAYMENT',
        sourceId: payment._id,
        referenceNumber: paymentReference,
        description: linkedPurchase
          ? `Payment for purchase ${linkedPurchase.purchaseNumber}`
          : `Payment to ${supplier.businessName}`,
        createdBy: req.user._id
      });
      await ledgerEntry.save();

      await createAuditRecord({
        actorId: req.user._id,
        actorRole: req.user.role,
        actorName: req.user.fullName,
        action: 'SUPPLIER_PAYMENT_RECORDED',
        entityType: 'SupplierPayment',
        entityId: payment._id,
        diff: {
          before: null,
          after: {
            paymentReference,
            supplierName: supplier.businessName,
            amount: paymentAmount,
            paymentMethod: normalizedMethod,
            purchaseNumber: linkedPurchase?.purchaseNumber || 'GENERAL_ACCOUNT'
          }
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-api'
      });
    }

    return res.status(201).json({
      success: true,
      message: `Payment ${payment.paymentReference} of ₹${payment.amount} recorded successfully.`,
      data: payment
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/supplier-payments/:id/reverse [OWNER ONLY]
export async function reverseSupplierPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { reversalReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid payment ID format.' }
      });
    }

    if (!reversalReason || !String(reversalReason).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'REASON_REQUIRED', message: 'Reversal reason is mandatory for payment corrections.' }
      });
    }

    const payment = await SupplierPayment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Supplier payment not found.' }
      });
    }

    if (payment.status === 'REVERSED') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_REVERSED', message: 'Payment has already been reversed.' }
      });
    }

    payment.status = 'REVERSED';
    payment.reversedAt = new Date();
    payment.reversedBy = req.user._id;
    payment.reversalReason = String(reversalReason).trim();

    const isTxn = await isTransactionSupported();

    if (isTxn) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await payment.save({ session });

          // If linked to a purchase, restore the balance
          if (payment.purchaseId) {
            const purchase = await SupplierPurchase.findById(payment.purchaseId).session(session);
            if (purchase) {
              purchase.amountPaid = roundCurrency(Math.max(0, purchase.amountPaid - payment.amount));
              purchase.balanceDue = roundCurrency(Math.max(0, purchase.grandTotal - purchase.amountPaid));
              purchase.paymentStatus =
                purchase.amountPaid <= 0
                  ? 'UNPAID'
                  : purchase.balanceDue > 0
                  ? 'PARTIALLY_PAID'
                  : 'PAID';
              purchase.updatedBy = req.user._id;
              await purchase.save({ session });
            }
          }

          // Compensating DEBIT entry in supplier ledger (increases garage debt again)
          const reversalDebit = new SupplierLedgerEntry({
            supplierId: payment.supplierId,
            entryType: 'PAYMENT_REVERSAL',
            direction: 'DEBIT',
            amount: payment.amount,
            sourceType: 'PAYMENT',
            sourceId: payment._id,
            referenceNumber: `REV-${payment.paymentReference}`,
            description: `Payment ${payment.paymentReference} reversed by OWNER: ${String(reversalReason).trim()}`,
            createdBy: req.user._id
          });
          await reversalDebit.save({ session });

          await createAuditRecord({
            actorId: req.user._id,
            actorRole: 'OWNER',
            actorName: req.user.fullName,
            action: 'SUPPLIER_PAYMENT_REVERSED',
            entityType: 'SupplierPayment',
            entityId: payment._id,
            diff: {
              before: { status: 'COMPLETED' },
              after: { status: 'REVERSED', reason: payment.reversalReason }
            },
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.headers['user-agent'] || 'admin-api'
          });
        });
      } finally {
        await session.endSession();
      }
    } else {
      await payment.save();

      if (payment.purchaseId) {
        const purchase = await SupplierPurchase.findById(payment.purchaseId);
        if (purchase) {
          purchase.amountPaid = roundCurrency(Math.max(0, purchase.amountPaid - payment.amount));
          purchase.balanceDue = roundCurrency(Math.max(0, purchase.grandTotal - purchase.amountPaid));
          purchase.paymentStatus =
            purchase.amountPaid <= 0
              ? 'UNPAID'
              : purchase.balanceDue > 0
              ? 'PARTIALLY_PAID'
              : 'PAID';
          purchase.updatedBy = req.user._id;
          await purchase.save();
        }
      }

      const reversalDebit = new SupplierLedgerEntry({
        supplierId: payment.supplierId,
        entryType: 'PAYMENT_REVERSAL',
        direction: 'DEBIT',
        amount: payment.amount,
        sourceType: 'PAYMENT',
        sourceId: payment._id,
        referenceNumber: `REV-${payment.paymentReference}`,
        description: `Payment ${payment.paymentReference} reversed by OWNER: ${String(reversalReason).trim()}`,
        createdBy: req.user._id
      });
      await reversalDebit.save();

      await createAuditRecord({
        actorId: req.user._id,
        actorRole: 'OWNER',
        actorName: req.user.fullName,
        action: 'SUPPLIER_PAYMENT_REVERSED',
        entityType: 'SupplierPayment',
        entityId: payment._id,
        diff: {
          before: { status: 'COMPLETED' },
          after: { status: 'REVERSED', reason: payment.reversalReason }
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-api'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Payment ${payment.paymentReference} reversed successfully.`,
      data: payment
    });
  } catch (err) {
    next(err);
  }
}

// =========================================================================
// SECTION 4: DIGITAL SUPPLIER KHATTA (LEDGER & STATEMENTS)
// =========================================================================

// GET /api/v1/suppliers/:id/ledger
export async function getSupplierLedger(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid supplier ID format.' }
      });
    }

    const supplier = await Supplier.findById(id).lean();
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found.' }
      });
    }

    const { dateFrom, dateTo, entryType } = req.query;
    const filter = { supplierId: id };

    if (entryType && SUPPLIER_LEDGER_ENTRY_TYPES.includes(entryType.trim().toUpperCase())) {
      filter.entryType = entryType.trim().toUpperCase();
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          filter.createdAt.$gte = fromDate;
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }
    }

    const entries = await SupplierLedgerEntry.find(filter)
      .populate('createdBy', 'fullName role')
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    // Compute running balance
    let runningBalance = 0;
    const entriesWithRunningBalance = entries.map((entry) => {
      if (entry.direction === 'DEBIT') {
        runningBalance = roundCurrency(runningBalance + entry.amount);
      } else {
        runningBalance = roundCurrency(runningBalance - entry.amount);
      }
      return {
        ...entry,
        runningBalance
      };
    });

    const summary = await calculateSupplierLedgerBalance(id);

    return res.status(200).json({
      success: true,
      data: {
        supplier: {
          _id: supplier._id,
          businessName: supplier.businessName,
          contactPerson: supplier.contactPerson,
          mobileNumber: supplier.mobileNumber,
          supplierCode: supplier.supplierCode,
          supplierCategory: supplier.supplierCategory
        },
        entries: entriesWithRunningBalance,
        summary: {
          totalDebit: summary.totalDebit,
          totalCredit: summary.totalCredit,
          netBalanceDue: summary.netBalanceDue,
          balanceDirection:
            summary.netBalanceDue > 0
              ? 'GARAGE_OWES'
              : summary.netBalanceDue < 0
              ? 'SUPPLIER_CREDIT'
              : 'BALANCED'
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/suppliers/:id/ledger/summary
export async function getSupplierLedgerSummary(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid supplier ID format.' }
      });
    }

    const summary = await calculateSupplierLedgerBalance(id);

    return res.status(200).json({
      success: true,
      data: {
        totalDebit: summary.totalDebit,
        totalCredit: summary.totalCredit,
        netBalanceDue: summary.netBalanceDue,
        currentOutstandingBalance: summary.netBalanceDue,
        status:
          summary.netBalanceDue > 0
            ? 'GARAGE_OWES'
            : summary.netBalanceDue < 0
            ? 'SUPPLIER_CREDIT'
            : 'BALANCED'
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/suppliers/:id/ledger/adjustments [OWNER ONLY]
export async function recordSupplierLedgerAdjustment(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid supplier ID format.' }
      });
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found.' }
      });
    }

    const { amount, direction, reason, entryType } = req.body;

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Adjustment amount must be greater than zero.' }
      });
    }

    const normalizedDirection = String(direction).trim().toUpperCase();
    if (!SUPPLIER_LEDGER_DIRECTIONS.includes(normalizedDirection)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DIRECTION', message: 'Direction must be either DEBIT or CREDIT.' }
      });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'REASON_REQUIRED', message: 'A clear reason is required for manual ledger adjustments.' }
      });
    }

    const normalizedType = entryType === 'OPENING_BALANCE' ? 'OPENING_BALANCE' : 'ADJUSTMENT';
    const timestamp = Date.now();
    const referenceNumber = `ADJ-${timestamp.toString().slice(-6)}`;

    const adjustmentEntry = new SupplierLedgerEntry({
      supplierId: supplier._id,
      entryType: normalizedType,
      direction: normalizedDirection,
      amount: roundCurrency(parsedAmount),
      sourceType: 'ADJUSTMENT',
      sourceId: null,
      referenceNumber,
      description: `OWNER Adjustment: ${String(reason).trim()}`,
      createdBy: req.user._id
    });

    await adjustmentEntry.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: 'OWNER',
      actorName: req.user.fullName,
      action: 'SUPPLIER_LEDGER_ADJUSTMENT',
      entityType: 'SupplierLedgerEntry',
      entityId: adjustmentEntry._id,
      diff: {
        before: null,
        after: {
          supplierId: supplier._id,
          direction: normalizedDirection,
          amount: roundCurrency(parsedAmount),
          reason: String(reason).trim()
        }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    const newSummary = await calculateSupplierLedgerBalance(supplier._id);

    return res.status(201).json({
      success: true,
      message: 'Supplier ledger adjustment recorded successfully.',
      data: {
        entry: adjustmentEntry,
        netBalanceDue: newSummary.netBalanceDue
      }
    });
  } catch (err) {
    next(err);
  }
}
