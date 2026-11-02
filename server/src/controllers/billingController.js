import mongoose from 'mongoose';
import {
  Invoice,
  INVOICE_STATUSES,
  PAYMENT_STATUSES,
  Payment,
  PAYMENT_METHODS,
  CustomerLedgerEntry,
  Customer,
  Vehicle,
  JobCard,
  ServiceEstimate
} from '../models/index.js';
import { createAuditRecord } from '../services/auditService.js';
import { roundCurrency, calculateInvoiceTotals } from '../utils/billingCalculations.js';
import { isTransactionSupported } from '../config/db.js';

function escapeRegex(text) {
  return String(text || '').slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sequential unique invoice number generator: INV-YYYYMMDD-XXXX
 */
async function generateInvoiceNumber(session = null) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const prefix = `INV-${yyyy}${mm}${dd}-`;

  const query = Invoice.findOne({ invoiceNumber: new RegExp(`^${prefix}`) })
    .sort({ invoiceNumber: -1 })
    .select('invoiceNumber');

  if (session) query.session(session);
  const latest = await query.lean();

  let nextSeq = 1;
  if (latest && latest.invoiceNumber) {
    const parts = latest.invoiceNumber.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) nextSeq = parsed + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Sequential unique payment reference generator: PAY-YYYYMMDD-XXXX
 */
async function generatePaymentReference(session = null) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const prefix = `PAY-${yyyy}${mm}${dd}-`;

  const query = Payment.findOne({ paymentReference: new RegExp(`^${prefix}`) })
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

// ==========================================
// 1. LIST INVOICES (GET /api/v1/invoices)
// ==========================================
export async function listInvoices(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { search, paymentStatus, invoiceStatus, customerId, dateFrom, dateTo } = req.query;
    const filter = {};

    if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus.trim().toUpperCase())) {
      filter.paymentStatus = paymentStatus.trim().toUpperCase();
    }

    if (invoiceStatus && INVOICE_STATUSES.includes(invoiceStatus.trim().toUpperCase())) {
      filter.invoiceStatus = invoiceStatus.trim().toUpperCase();
    }

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      filter.customerId = customerId;
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

    if (search && search.trim()) {
      const safe = escapeRegex(search.trim());
      filter.$or = [
        { invoiceNumber: { $regex: safe, $options: 'i' } },
        { 'customerSnapshot.fullName': { $regex: safe, $options: 'i' } },
        { 'customerSnapshot.mobileNumber': { $regex: safe, $options: 'i' } },
        { 'vehicleSnapshot.registrationNumber': { $regex: safe, $options: 'i' } },
        { 'jobCardSnapshot.jobCardNumber': { $regex: safe, $options: 'i' } }
      ];
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'fullName mobileNumber')
        .populate('vehicleId', 'brand model registrationNumberDisplay')
        .populate('createdBy', 'fullName role email'),
      Invoice.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 2. CREATE INVOICE (POST /api/v1/invoices)
// ==========================================
export async function createInvoice(req, res, next) {
  try {
    const {
      jobCardId,
      items: rawItems,
      discountAmount = 0,
      taxRate = 0,
      dueDate,
      notes = '',
      termsAndConditions,
      ownerExceptionReason
    } = req.body;

    if (!jobCardId || !mongoose.Types.ObjectId.isValid(jobCardId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_JOB_CARD_ID', message: 'A valid Job Card ID is required.' }
      });
    }

    const jobCard = await JobCard.findById(jobCardId)
      .populate('customerId')
      .populate('vehicleId');

    if (!jobCard) {
      return res.status(404).json({
        success: false,
        error: { code: 'JOB_CARD_NOT_FOUND', message: 'Target Job Card record not found.' }
      });
    }

    // Business Rule: Job Card must be COMPLETED or DELIVERED, unless OWNER explicitly authorizes an exception
    const isCompletedOrDelivered = ['COMPLETED', 'DELIVERED'].includes(jobCard.status);
    const hasOwnerException =
      req.user.role === 'OWNER' && Boolean(ownerExceptionReason && String(ownerExceptionReason).trim());

    if (!isCompletedOrDelivered && !hasOwnerException) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'JOB_CARD_NOT_COMPLETED',
          message: `Cannot generate an invoice for Job Card in "${jobCard.status}" state. Job Card must be COMPLETED or DELIVERED, unless the OWNER explicitly records a documented exception.`
        }
      });
    }

    // Business Rule: Prevent accidental duplicate active invoices for the same Job Card
    const existingActiveInvoice = await Invoice.findOne({
      jobCardId: jobCard._id,
      invoiceStatus: { $in: ['DRAFT', 'ISSUED'] }
    });

    if (existingActiveInvoice) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ACTIVE_INVOICE_EXISTS',
          message: `An active invoice (${existingActiveInvoice.invoiceNumber}) already exists for this Job Card.`
        }
      });
    }

    // Determine line items: from request body, or auto-populate from approved estimate / requested services
    let itemsToProcess = rawItems;
    let linkedEstimateId = null;

    if (!Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
      // Look for approved ServiceEstimate on this Job Card
      const approvedEstimate = await ServiceEstimate.findOne({
        jobCardId: jobCard._id,
        status: { $in: ['APPROVED', 'PARTIALLY_APPROVED'] }
      }).sort({ versionNumber: -1 });

      if (approvedEstimate && approvedEstimate.items.length > 0) {
        linkedEstimateId = approvedEstimate._id;
        // Only take approved items if partially approved
        itemsToProcess = approvedEstimate.items
          .filter((it) => it.status === 'APPROVED')
          .map((it) => ({
            itemName: it.itemName,
            description: it.description,
            itemType: it.itemType || 'SERVICE',
            quantity: it.quantity,
            unit: it.unit || 'job',
            unitPrice: it.unitPrice,
            sourceEstimateItemId: it._id
          }));
      } else if (Array.isArray(jobCard.requestedServices) && jobCard.requestedServices.length > 0) {
        itemsToProcess = jobCard.requestedServices.map((s) => ({
          itemName: s.name,
          description: s.category || '',
          itemType: 'SERVICE',
          quantity: 1,
          unit: 'job',
          unitPrice: s.price || 0
        }));
      }
    }

    if (!Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ITEMS_REQUIRED',
          message: 'Invoice must contain at least one valid line item.'
        }
      });
    }

    // Strict server-side total calculation
    let calculated;
    try {
      calculated = calculateInvoiceTotals(itemsToProcess, discountAmount, taxRate);
    } catch (calcErr) {
      return res.status(400).json({
        success: false,
        error: { code: calcErr.code || 'CALCULATION_ERROR', message: calcErr.message }
      });
    }

    // Build historical snapshots
    const customerSnapshot = {
      fullName: jobCard.customerSnapshot?.fullName || jobCard.customerId?.fullName || 'Customer',
      mobileNumber: jobCard.customerSnapshot?.mobileNumber || jobCard.customerId?.mobileNumber || '',
      email: jobCard.customerSnapshot?.email || jobCard.customerId?.email || '',
      city: jobCard.customerSnapshot?.city || jobCard.customerId?.city || 'Gohana',
      address: jobCard.customerSnapshot?.address || jobCard.customerId?.address || ''
    };

    const vehicleSnapshot = {
      brand: jobCard.vehicleSnapshot?.brand || jobCard.vehicleId?.brand || '',
      model: jobCard.vehicleSnapshot?.model || jobCard.vehicleId?.model || '',
      registrationNumber:
        jobCard.vehicleSnapshot?.registrationNumber ||
        jobCard.vehicleId?.registrationNumberDisplay ||
        jobCard.vehicleId?.registrationNumberClean ||
        'PROVISIONAL',
      fuelType: jobCard.vehicleSnapshot?.fuelType || jobCard.vehicleId?.fuelType || 'OTHER',
      manufacturingYear: jobCard.vehicleSnapshot?.manufacturingYear || jobCard.vehicleId?.manufacturingYear || null,
      color: jobCard.vehicleSnapshot?.color || jobCard.vehicleId?.color || ''
    };

    const jobCardSnapshot = {
      jobCardNumber: jobCard.jobCardNumber,
      odometerReading: jobCard.odometerReading || 0,
      fuelLevel: jobCard.fuelLevel || 'QUARTER',
      receivedAt: jobCard.receivedAt || null,
      completedAt: jobCard.completedAt || null
    };

    let savedInvoice = null;
    let attempts = 0;

    while (!savedInvoice && attempts < 5) {
      attempts++;
      const invoiceNumber = await generateInvoiceNumber(null);

      const invoiceDoc = new Invoice({
        invoiceNumber,
        customerId: jobCard.customerId._id || jobCard.customerId,
        vehicleId: jobCard.vehicleId._id || jobCard.vehicleId,
        jobCardId: jobCard._id,
        estimateId: linkedEstimateId,
        customerSnapshot,
        vehicleSnapshot,
        jobCardSnapshot,
        items: calculated.items,
        subtotal: calculated.subtotal,
        discountAmount: calculated.discountAmount,
        taxRate: calculated.taxRate,
        taxAmount: calculated.taxAmount,
        grandTotal: calculated.grandTotal,
        amountPaid: 0,
        balanceDue: calculated.grandTotal,
        paymentStatus: 'UNPAID',
        invoiceStatus: 'DRAFT',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: String(notes || '').trim(),
        termsAndConditions: termsAndConditions
          ? String(termsAndConditions).trim()
          : 'All work and replaced parts are verified by Mahadev Garage. Payment is due upon delivery.',
        createdBy: req.user._id,
        updatedBy: req.user._id
      });

      try {
        await invoiceDoc.save();
        savedInvoice = invoiceDoc;
      } catch (saveErr) {
        if (saveErr.code === 11000 && attempts < 5) continue;
        throw saveErr;
      }
    }

    // Update Job Card with invoice link
    jobCard.invoiceId = savedInvoice._id;
    jobCard.invoiceSummary = {
      invoiceNumber: savedInvoice.invoiceNumber,
      grandTotal: savedInvoice.grandTotal,
      amountPaid: 0,
      balanceDue: savedInvoice.balanceDue,
      invoiceStatus: 'DRAFT',
      paymentStatus: 'UNPAID'
    };
    await jobCard.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'INVOICE_CREATED',
      entityType: 'Invoice',
      entityId: savedInvoice._id,
      diff: {
        before: null,
        after: {
          invoiceNumber: savedInvoice.invoiceNumber,
          jobCardId: jobCard._id,
          grandTotal: savedInvoice.grandTotal,
          invoiceStatus: 'DRAFT',
          paymentStatus: 'UNPAID'
        }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(201).json({
      success: true,
      message: `Invoice ${savedInvoice.invoiceNumber} created in DRAFT status.`,
      data: savedInvoice
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 3. GET INVOICE BY ID (GET /api/v1/invoices/:id)
// ==========================================
export async function getInvoiceById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Invoice ID format.' }
      });
    }

    const invoice = await Invoice.findById(id)
      .populate('customerId')
      .populate('vehicleId')
      .populate('jobCardId')
      .populate('estimateId')
      .populate('createdBy', 'fullName role email')
      .populate('updatedBy', 'fullName role email')
      .populate('cancelledBy', 'fullName role email');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' }
      });
    }

    // Also fetch associated payments
    const payments = await Payment.find({ invoiceId: invoice._id })
      .sort({ createdAt: -1 })
      .populate('receivedBy', 'fullName role')
      .populate('reversedBy', 'fullName role');

    return res.status(200).json({
      success: true,
      data: {
        ...invoice.toObject(),
        payments
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 4. UPDATE DRAFT INVOICE (PATCH /api/v1/invoices/:id)
// ==========================================
export async function updateInvoice(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Invoice ID format.' }
      });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' }
      });
    }

    // Rule: An issued or cancelled invoice must not be silently edited!
    if (invoice.invoiceStatus !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_EDIT_ISSUED_INVOICE',
          message: `Cannot edit an invoice with status "${invoice.invoiceStatus}". Issued invoices are immutable financial records.`
        }
      });
    }

    const { items, discountAmount, taxRate, dueDate, notes, termsAndConditions } = req.body;

    const itemsToCalculate = items !== undefined ? items : invoice.items;
    const discountToCalculate = discountAmount !== undefined ? discountAmount : invoice.discountAmount;
    const taxRateToCalculate = taxRate !== undefined ? taxRate : invoice.taxRate;

    let calculated;
    try {
      calculated = calculateInvoiceTotals(itemsToCalculate, discountToCalculate, taxRateToCalculate);
    } catch (calcErr) {
      return res.status(400).json({
        success: false,
        error: { code: calcErr.code || 'CALCULATION_ERROR', message: calcErr.message }
      });
    }

    invoice.items = calculated.items;
    invoice.subtotal = calculated.subtotal;
    invoice.discountAmount = calculated.discountAmount;
    invoice.taxRate = calculated.taxRate;
    invoice.taxAmount = calculated.taxAmount;
    invoice.grandTotal = calculated.grandTotal;
    invoice.balanceDue = calculated.grandTotal; // Draft has amountPaid = 0

    if (dueDate !== undefined) invoice.dueDate = dueDate ? new Date(dueDate) : null;
    if (notes !== undefined) invoice.notes = String(notes).trim();
    if (termsAndConditions !== undefined) invoice.termsAndConditions = String(termsAndConditions).trim();

    invoice.updatedBy = req.user._id;
    await invoice.save();

    // Update Job Card summary
    await JobCard.findByIdAndUpdate(invoice.jobCardId, {
      'invoiceSummary.grandTotal': invoice.grandTotal,
      'invoiceSummary.balanceDue': invoice.balanceDue
    });

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'INVOICE_UPDATED',
      entityType: 'Invoice',
      entityId: invoice._id,
      diff: {
        before: { grandTotal: invoice.grandTotal },
        after: { grandTotal: calculated.grandTotal, itemsCount: calculated.items.length }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: 'Draft invoice updated successfully.',
      data: invoice
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 5. ISSUE INVOICE (POST /api/v1/invoices/:id/issue)
// ==========================================
export async function issueInvoice(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Invoice ID format.' }
      });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' }
      });
    }

    if (invoice.invoiceStatus === 'ISSUED') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVOICE_ALREADY_ISSUED', message: 'This invoice has already been issued.' }
      });
    }

    if (invoice.invoiceStatus === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_ISSUE_CANCELLED', message: 'Cannot issue a cancelled invoice.' }
      });
    }

    const supportsTxn = await isTransactionSupported();

    if (supportsTxn) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          invoice.invoiceStatus = 'ISSUED';
          invoice.issueDate = new Date();
          invoice.issuedAt = invoice.issueDate;
          invoice.updatedBy = req.user._id;
          await invoice.save({ session });

          // Atomic append-only Customer Ledger DEBIT entry
          const ledgerEntry = new CustomerLedgerEntry({
            customerId: invoice.customerId,
            entryType: 'INVOICE_ISSUED',
            direction: 'DEBIT',
            amount: invoice.grandTotal,
            sourceType: 'INVOICE',
            sourceId: invoice._id,
            referenceNumber: invoice.invoiceNumber,
            description: `Invoice ${invoice.invoiceNumber} issued for Job Card ${invoice.jobCardSnapshot.jobCardNumber}`,
            createdBy: req.user._id,
            createdAt: new Date()
          });
          await ledgerEntry.save({ session });

          await JobCard.findByIdAndUpdate(
            invoice.jobCardId,
            { 'invoiceSummary.invoiceStatus': 'ISSUED' },
            { session }
          );

          await createAuditRecord({
            actorId: req.user._id,
            actorRole: req.user.role,
            actorName: req.user.fullName,
            action: 'INVOICE_ISSUED',
            entityType: 'Invoice',
            entityId: invoice._id,
            diff: {
              before: { invoiceStatus: 'DRAFT' },
              after: { invoiceStatus: 'ISSUED', grandTotal: invoice.grandTotal }
            },
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.headers['user-agent'] || 'admin-api'
          });
        });
      } finally {
        await session.endSession();
      }
    } else {
      invoice.invoiceStatus = 'ISSUED';
      invoice.issueDate = new Date();
      invoice.issuedAt = invoice.issueDate;
      invoice.updatedBy = req.user._id;
      await invoice.save();

      // Append-only Customer Ledger DEBIT entry
      const ledgerEntry = new CustomerLedgerEntry({
        customerId: invoice.customerId,
        entryType: 'INVOICE_ISSUED',
        direction: 'DEBIT',
        amount: invoice.grandTotal,
        sourceType: 'INVOICE',
        sourceId: invoice._id,
        referenceNumber: invoice.invoiceNumber,
        description: `Invoice ${invoice.invoiceNumber} issued for Job Card ${invoice.jobCardSnapshot.jobCardNumber}`,
        createdBy: req.user._id,
        createdAt: new Date()
      });
      await ledgerEntry.save();

      await JobCard.findByIdAndUpdate(invoice.jobCardId, {
        'invoiceSummary.invoiceStatus': 'ISSUED'
      });

      await createAuditRecord({
        actorId: req.user._id,
        actorRole: req.user.role,
        actorName: req.user.fullName,
        action: 'INVOICE_ISSUED',
        entityType: 'Invoice',
        entityId: invoice._id,
        diff: {
          before: { invoiceStatus: 'DRAFT' },
          after: { invoiceStatus: 'ISSUED', grandTotal: invoice.grandTotal }
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-api'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} issued successfully and debited to customer khatta.`,
      data: invoice
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 6. CANCEL INVOICE (POST /api/v1/invoices/:id/cancel) — OWNER ONLY
// ==========================================
export async function cancelInvoice(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Invoice ID format.' }
      });
    }

    // OWNER ONLY
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_OWNER_ONLY',
          message: 'Cancelling issued financial invoices is strictly restricted to the OWNER role.'
        }
      });
    }

    const { cancellationReason } = req.body;
    if (!cancellationReason || !String(cancellationReason).trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANCELLATION_REASON_REQUIRED',
          message: 'A documented operational justification / reason is mandatory when cancelling an invoice.'
        }
      });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' }
      });
    }

    if (invoice.invoiceStatus === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CANCELLED', message: 'Invoice is already cancelled.' }
      });
    }

    // Prevent cancelling an invoice that has active completed payments
    if (invoice.amountPaid > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENTS_EXIST_ON_INVOICE',
          message: `Cannot cancel an invoice with payments (₹${invoice.amountPaid} paid). Reverse all completed payments before cancelling the invoice.`
        }
      });
    }

    const previousStatus = invoice.invoiceStatus;
    const supportsTxn = await isTransactionSupported();

    if (supportsTxn) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          invoice.invoiceStatus = 'CANCELLED';
          invoice.cancelledAt = new Date();
          invoice.cancellationReason = String(cancellationReason).trim();
          invoice.cancelledBy = req.user._id;
          invoice.updatedBy = req.user._id;
          await invoice.save({ session });

          // If was previously ISSUED: neutralize customer khatta debit with a CREDIT adjustment
          if (previousStatus === 'ISSUED') {
            const cancelCredit = new CustomerLedgerEntry({
              customerId: invoice.customerId,
              entryType: 'ADJUSTMENT',
              direction: 'CREDIT',
              amount: invoice.grandTotal,
              sourceType: 'INVOICE',
              sourceId: invoice._id,
              referenceNumber: `CANCEL-${invoice.invoiceNumber}`,
              description: `Invoice ${invoice.invoiceNumber} cancelled by OWNER: ${String(cancellationReason).trim()}`,
              createdBy: req.user._id,
              createdAt: new Date()
            });
            await cancelCredit.save({ session });
          }

          await JobCard.findByIdAndUpdate(
            invoice.jobCardId,
            {
              invoiceId: null,
              'invoiceSummary.invoiceStatus': 'CANCELLED'
            },
            { session }
          );

          await createAuditRecord({
            actorId: req.user._id,
            actorRole: 'OWNER',
            actorName: req.user.fullName,
            action: 'INVOICE_CANCELLED',
            entityType: 'Invoice',
            entityId: invoice._id,
            diff: {
              before: { invoiceStatus: previousStatus },
              after: { invoiceStatus: 'CANCELLED', reason: String(cancellationReason).trim() }
            },
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.headers['user-agent'] || 'admin-api'
          });
        });
      } finally {
        await session.endSession();
      }
    } else {
      invoice.invoiceStatus = 'CANCELLED';
      invoice.cancelledAt = new Date();
      invoice.cancellationReason = String(cancellationReason).trim();
      invoice.cancelledBy = req.user._id;
      invoice.updatedBy = req.user._id;
      await invoice.save();

      if (previousStatus === 'ISSUED') {
        const cancelCredit = new CustomerLedgerEntry({
          customerId: invoice.customerId,
          entryType: 'ADJUSTMENT',
          direction: 'CREDIT',
          amount: invoice.grandTotal,
          sourceType: 'INVOICE',
          sourceId: invoice._id,
          referenceNumber: `CANCEL-${invoice.invoiceNumber}`,
          description: `Invoice ${invoice.invoiceNumber} cancelled by OWNER: ${String(cancellationReason).trim()}`,
          createdBy: req.user._id,
          createdAt: new Date()
        });
        await cancelCredit.save();
      }

      await JobCard.findByIdAndUpdate(invoice.jobCardId, {
        invoiceId: null,
        'invoiceSummary.invoiceStatus': 'CANCELLED'
      });

      await createAuditRecord({
        actorId: req.user._id,
        actorRole: 'OWNER',
        actorName: req.user.fullName,
        action: 'INVOICE_CANCELLED',
        entityType: 'Invoice',
        entityId: invoice._id,
        diff: {
          before: { invoiceStatus: previousStatus },
          after: { invoiceStatus: 'CANCELLED', reason: String(cancellationReason).trim() }
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-api'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} cancelled successfully.`,
      data: invoice
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 7. RECORD PAYMENT (POST /api/v1/invoices/:id/payments)
// ==========================================
export async function recordPayment(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Invoice ID format.' }
      });
    }

    const {
      amount: rawAmount,
      paymentMethod,
      transactionReference = '',
      paymentDate,
      notes = ''
    } = req.body;

    const amount = roundCurrency(rawAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Payment amount must be greater than zero.' }
      });
    }

    if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYMENT_METHOD',
          message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`
        }
      });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' }
      });
    }

    if (invoice.invoiceStatus !== 'ISSUED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_ISSUED',
          message: `Cannot record payment for an invoice in "${invoice.invoiceStatus}" state. Invoice must be ISSUED first.`
        }
      });
    }

    // Overpayment Protection: prevent payments greater than remaining balanceDue
    if (amount > invoice.balanceDue) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OVERPAYMENT_REJECTED',
          message: `Payment amount (₹${amount.toFixed(2)}) exceeds remaining balance due of ₹${invoice.balanceDue.toFixed(2)}.`
        }
      });
    }

    let createdPayment = null;
    let savedInvoice = null;
    const supportsTxn = await isTransactionSupported();

    if (supportsTxn) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // Re-fetch within session for concurrency check
          const freshInv = await Invoice.findById(invoice._id).session(session);
          if (amount > freshInv.balanceDue) {
            const err = new Error(`Payment amount exceeds remaining balance of ₹${freshInv.balanceDue}`);
            err.statusCode = 400;
            err.code = 'OVERPAYMENT_REJECTED';
            throw err;
          }

          const paymentReference = await generatePaymentReference(session);

          createdPayment = new Payment({
            paymentReference,
            invoiceId: freshInv._id,
            customerId: freshInv.customerId,
            amount,
            paymentMethod,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            transactionReference: String(transactionReference || '').trim(),
            receivedBy: req.user._id,
            notes: String(notes || '').trim(),
            status: 'COMPLETED'
          });
          await createdPayment.save({ session });

          // Update Invoice balances
          freshInv.amountPaid = roundCurrency(freshInv.amountPaid + amount);
          freshInv.balanceDue = roundCurrency(freshInv.grandTotal - freshInv.amountPaid);
          freshInv.paymentStatus =
            freshInv.balanceDue <= 0 ? 'PAID' : freshInv.amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
          freshInv.updatedBy = req.user._id;
          await freshInv.save({ session });
          savedInvoice = freshInv;

          // Append-only Customer Ledger CREDIT entry
          const ledgerEntry = new CustomerLedgerEntry({
            customerId: freshInv.customerId,
            entryType: 'PAYMENT_RECEIVED',
            direction: 'CREDIT',
            amount,
            sourceType: 'PAYMENT',
            sourceId: createdPayment._id,
            referenceNumber: paymentReference,
            description: `Payment of ₹${amount.toFixed(2)} received via ${paymentMethod} for Invoice ${freshInv.invoiceNumber}${transactionReference ? ` (Ref: ${transactionReference})` : ''}`,
            createdBy: req.user._id,
            createdAt: new Date()
          });
          await ledgerEntry.save({ session });

          // Update Job Card summary
          await JobCard.findByIdAndUpdate(
            freshInv.jobCardId,
            {
              'invoiceSummary.amountPaid': freshInv.amountPaid,
              'invoiceSummary.balanceDue': freshInv.balanceDue,
              'invoiceSummary.paymentStatus': freshInv.paymentStatus
            },
            { session }
          );

          await createAuditRecord({
            actorId: req.user._id,
            actorRole: req.user.role,
            actorName: req.user.fullName,
            action: 'PAYMENT_RECORDED',
            entityType: 'Payment',
            entityId: createdPayment._id,
            diff: {
              before: null,
              after: {
                paymentReference,
                invoiceId: freshInv._id,
                amount,
                paymentMethod,
                balanceDueAfter: freshInv.balanceDue,
                paymentStatus: freshInv.paymentStatus
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
      const paymentReference = await generatePaymentReference(null);

      createdPayment = new Payment({
        paymentReference,
        invoiceId: invoice._id,
        customerId: invoice.customerId,
        amount,
        paymentMethod,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        transactionReference: String(transactionReference || '').trim(),
        receivedBy: req.user._id,
        notes: String(notes || '').trim(),
        status: 'COMPLETED'
      });
      await createdPayment.save();

      invoice.amountPaid = roundCurrency(invoice.amountPaid + amount);
      invoice.balanceDue = roundCurrency(invoice.grandTotal - invoice.amountPaid);
      invoice.paymentStatus =
        invoice.balanceDue <= 0 ? 'PAID' : invoice.amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
      invoice.updatedBy = req.user._id;
      await invoice.save();
      savedInvoice = invoice;

      const ledgerEntry = new CustomerLedgerEntry({
        customerId: invoice.customerId,
        entryType: 'PAYMENT_RECEIVED',
        direction: 'CREDIT',
        amount,
        sourceType: 'PAYMENT',
        sourceId: createdPayment._id,
        referenceNumber: paymentReference,
        description: `Payment of ₹${amount.toFixed(2)} received via ${paymentMethod} for Invoice ${invoice.invoiceNumber}${transactionReference ? ` (Ref: ${transactionReference})` : ''}`,
        createdBy: req.user._id,
        createdAt: new Date()
      });
      await ledgerEntry.save();

      await JobCard.findByIdAndUpdate(invoice.jobCardId, {
        'invoiceSummary.amountPaid': invoice.amountPaid,
        'invoiceSummary.balanceDue': invoice.balanceDue,
        'invoiceSummary.paymentStatus': invoice.paymentStatus
      });

      await createAuditRecord({
        actorId: req.user._id,
        actorRole: req.user.role,
        actorName: req.user.fullName,
        action: 'PAYMENT_RECORDED',
        entityType: 'Payment',
        entityId: createdPayment._id,
        diff: {
          before: null,
          after: {
            paymentReference,
            invoiceId: invoice._id,
            amount,
            paymentMethod,
            balanceDueAfter: invoice.balanceDue,
            paymentStatus: invoice.paymentStatus
          }
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-api'
      });
    }

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${amount.toFixed(2)} recorded successfully. Invoice balance: ₹${savedInvoice.balanceDue.toFixed(2)}.`,
      data: {
        payment: createdPayment,
        invoice: savedInvoice
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 8. LIST PAYMENTS FOR INVOICE (GET /api/v1/invoices/:id/payments)
// ==========================================
export async function listPaymentsForInvoice(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Invoice ID format.' }
      });
    }

    const payments = await Payment.find({ invoiceId: id })
      .sort({ createdAt: -1 })
      .populate('receivedBy', 'fullName role email')
      .populate('reversedBy', 'fullName role email');

    return res.status(200).json({
      success: true,
      data: payments
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 9. REVERSE PAYMENT (POST /api/v1/payments/:id/reverse) — OWNER ONLY
// ==========================================
export async function reversePayment(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Payment ID format.' }
      });
    }

    // OWNER ONLY
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_OWNER_ONLY',
          message: 'Payment reversal is strictly restricted to the OWNER role.'
        }
      });
    }

    const { reversalReason } = req.body;
    if (!reversalReason || !String(reversalReason).trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REVERSAL_REASON_REQUIRED',
          message: 'A documented operational justification / reason is mandatory when reversing a payment.'
        }
      });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found.' }
      });
    }

    if (payment.status === 'REVERSED') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_REVERSED', message: 'This payment has already been reversed.' }
      });
    }

    const invoice = await Invoice.findById(payment.invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'INVOICE_NOT_FOUND', message: 'Associated invoice not found.' }
      });
    }

    let savedInvoice = null;
    const supportsTxn = await isTransactionSupported();

    if (supportsTxn) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          payment.status = 'REVERSED';
          payment.reversedAt = new Date();
          payment.reversedBy = req.user._id;
          payment.reversalReason = String(reversalReason).trim();
          await payment.save({ session });

          // Restore Invoice balance
          invoice.amountPaid = roundCurrency(Math.max(0, invoice.amountPaid - payment.amount));
          invoice.balanceDue = roundCurrency(invoice.grandTotal - invoice.amountPaid);
          invoice.paymentStatus =
            invoice.balanceDue <= 0 ? 'PAID' : invoice.amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
          invoice.updatedBy = req.user._id;
          await invoice.save({ session });
          savedInvoice = invoice;

          // Append-only Customer Ledger DEBIT entry (reversing past credit)
          const ledgerEntry = new CustomerLedgerEntry({
            customerId: payment.customerId,
            entryType: 'PAYMENT_REVERSED',
            direction: 'DEBIT',
            amount: payment.amount,
            sourceType: 'PAYMENT',
            sourceId: payment._id,
            referenceNumber: `REV-${payment.paymentReference}`,
            description: `Payment ${payment.paymentReference} of ₹${payment.amount.toFixed(2)} reversed by OWNER: ${String(reversalReason).trim()}`,
            createdBy: req.user._id,
            createdAt: new Date()
          });
          await ledgerEntry.save({ session });

          await JobCard.findByIdAndUpdate(
            invoice.jobCardId,
            {
              'invoiceSummary.amountPaid': invoice.amountPaid,
              'invoiceSummary.balanceDue': invoice.balanceDue,
              'invoiceSummary.paymentStatus': invoice.paymentStatus
            },
            { session }
          );

          await createAuditRecord({
            actorId: req.user._id,
            actorRole: 'OWNER',
            actorName: req.user.fullName,
            action: 'PAYMENT_REVERSED',
            entityType: 'Payment',
            entityId: payment._id,
            diff: {
              before: { status: 'COMPLETED', invoiceBalanceDue: invoice.balanceDue - payment.amount },
              after: {
                status: 'REVERSED',
                invoiceBalanceDue: invoice.balanceDue,
                reason: String(reversalReason).trim()
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
      payment.status = 'REVERSED';
      payment.reversedAt = new Date();
      payment.reversedBy = req.user._id;
      payment.reversalReason = String(reversalReason).trim();
      await payment.save();

      invoice.amountPaid = roundCurrency(Math.max(0, invoice.amountPaid - payment.amount));
      invoice.balanceDue = roundCurrency(invoice.grandTotal - invoice.amountPaid);
      invoice.paymentStatus =
        invoice.balanceDue <= 0 ? 'PAID' : invoice.amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
      invoice.updatedBy = req.user._id;
      await invoice.save();
      savedInvoice = invoice;

      const ledgerEntry = new CustomerLedgerEntry({
        customerId: payment.customerId,
        entryType: 'PAYMENT_REVERSED',
        direction: 'DEBIT',
        amount: payment.amount,
        sourceType: 'PAYMENT',
        sourceId: payment._id,
        referenceNumber: `REV-${payment.paymentReference}`,
        description: `Payment ${payment.paymentReference} of ₹${payment.amount.toFixed(2)} reversed by OWNER: ${String(reversalReason).trim()}`,
        createdBy: req.user._id,
        createdAt: new Date()
      });
      await ledgerEntry.save();

      await JobCard.findByIdAndUpdate(invoice.jobCardId, {
        'invoiceSummary.amountPaid': invoice.amountPaid,
        'invoiceSummary.balanceDue': invoice.balanceDue,
        'invoiceSummary.paymentStatus': invoice.paymentStatus
      });

      await createAuditRecord({
        actorId: req.user._id,
        actorRole: 'OWNER',
        actorName: req.user.fullName,
        action: 'PAYMENT_REVERSED',
        entityType: 'Payment',
        entityId: payment._id,
        diff: {
          before: { status: 'COMPLETED', invoiceBalanceDue: invoice.balanceDue - payment.amount },
          after: {
            status: 'REVERSED',
            invoiceBalanceDue: invoice.balanceDue,
            reason: String(reversalReason).trim()
          }
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-api'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Payment ${payment.paymentReference} reversed. Invoice balance restored to ₹${savedInvoice.balanceDue.toFixed(2)}.`,
      data: { payment, invoice: savedInvoice }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 10. GET CUSTOMER LEDGER (GET /api/v1/customers/:id/ledger)
// ==========================================
export async function getCustomerLedger(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Customer ID format.' }
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' }
      });
    }

    const { dateFrom, dateTo, timeRange } = req.query;
    const filter = { customerId: id };

    // Date filters
    const now = new Date();
    if (timeRange === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: start };
    } else if (timeRange === 'week') {
      const start = new Date(now.getTime() - 7 * 86400000);
      start.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: start };
    } else if (timeRange === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      filter.createdAt = { $gte: start };
    } else if (dateFrom || dateTo) {
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

    // Always fetch all entries in chronological order to compute exact running balance
    const allCustomerEntries = await CustomerLedgerEntry.find({ customerId: id })
      .sort({ createdAt: 1 })
      .populate('createdBy', 'fullName role')
      .lean();

    let runningBalance = 0;
    const entriesWithRunningBalance = allCustomerEntries.map((entry) => {
      // DEBIT adds to what customer owes, CREDIT subtracts
      if (entry.direction === 'DEBIT') {
        runningBalance = roundCurrency(runningBalance + entry.amount);
      } else {
        runningBalance = roundCurrency(runningBalance - entry.amount);
      }
      return {
        ...entry,
        balanceAfter: runningBalance
      };
    });

    // Apply date filtering to the computed entries
    let filteredEntries = entriesWithRunningBalance;
    if (filter.createdAt) {
      filteredEntries = entriesWithRunningBalance.filter((entry) => {
        const entryDate = new Date(entry.createdAt);
        if (filter.createdAt.$gte && entryDate < filter.createdAt.$gte) return false;
        if (filter.createdAt.$lte && entryDate > filter.createdAt.$lte) return false;
        return true;
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        customer: {
          _id: customer._id,
          fullName: customer.fullName,
          mobileNumber: customer.mobileNumber,
          city: customer.city
        },
        currentOutstanding: runningBalance,
        summary: {
          totalDebit: roundCurrency(allCustomerEntries.filter(e => e.direction === 'DEBIT').reduce((s, e) => s + e.amount, 0)),
          totalCredit: roundCurrency(allCustomerEntries.filter(e => e.direction === 'CREDIT').reduce((s, e) => s + e.amount, 0)),
          netBalanceDue: runningBalance,
          currentOutstanding: runningBalance
        },
        entries: filteredEntries.reverse() // Display latest first
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 11. GET CUSTOMER LEDGER SUMMARY (GET /api/v1/customers/:id/ledger/summary)
// ==========================================
export async function getCustomerLedgerSummary(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Customer ID format.' }
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' }
      });
    }

    // Total Invoiced (issued invoices)
    const issuedInvoices = await Invoice.find({
      customerId: id,
      invoiceStatus: 'ISSUED'
    }).select('grandTotal amountPaid balanceDue paymentStatus createdAt');

    const totalInvoiced = roundCurrency(issuedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0));
    const totalPaidInvoices = roundCurrency(issuedInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0));
    const unpaidInvoicesCount = issuedInvoices.filter((inv) =>
      ['UNPAID', 'PARTIALLY_PAID'].includes(inv.paymentStatus)
    ).length;

    // Direct ledger calculation for net outstanding including adjustments & opening balance
    const allLedgerEntries = await CustomerLedgerEntry.find({ customerId: id }).lean();
    let netOutstanding = 0;
    allLedgerEntries.forEach((entry) => {
      if (entry.direction === 'DEBIT') {
        netOutstanding = roundCurrency(netOutstanding + entry.amount);
      } else {
        netOutstanding = roundCurrency(netOutstanding - entry.amount);
      }
    });

    // Last payment date
    const lastPayment = await Payment.findOne({ customerId: id, status: 'COMPLETED' })
      .sort({ paymentDate: -1 })
      .select('paymentDate amount paymentMethod');

    // Last service date from Job Cards
    const lastJobCard = await JobCard.findOne({ customerId: id })
      .sort({ createdAt: -1 })
      .select('receivedAt completedAt status jobCardNumber');

    return res.status(200).json({
      success: true,
      data: {
        customerId: customer._id,
        fullName: customer.fullName,
        customerName: customer.fullName,
        mobileNumber: customer.mobileNumber,
        totalInvoiced,
        totalPaid: totalPaidInvoices,
        totalDebit: roundCurrency(allLedgerEntries.filter(e => e.direction === 'DEBIT').reduce((s, e) => s + e.amount, 0)),
        totalCredit: roundCurrency(allLedgerEntries.filter(e => e.direction === 'CREDIT').reduce((s, e) => s + e.amount, 0)),
        currentOutstanding: netOutstanding,
        netBalanceDue: netOutstanding,
        status: netOutstanding === 0 ? 'CLEARED' : netOutstanding > 0 ? 'OUTSTANDING' : 'CREDIT',
        unpaidInvoicesCount,
        lastPaymentDate: lastPayment ? lastPayment.paymentDate : null,
        lastPaymentAmount: lastPayment ? lastPayment.amount : null,
        lastPaymentMethod: lastPayment ? lastPayment.paymentMethod : null,
        lastServiceDate: lastJobCard ? lastJobCard.completedAt || lastJobCard.receivedAt : null,
        lastJobCardNumber: lastJobCard ? lastJobCard.jobCardNumber : null
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 12. RECORD CUSTOMER LEDGER ADJUSTMENT (POST /api/v1/customers/:id/ledger/adjustments) — OWNER ONLY
// ==========================================
export async function recordCustomerLedgerAdjustment(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Customer ID format.' }
      });
    }

    // OWNER ONLY
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_OWNER_ONLY',
          message: 'Direct customer khatta adjustments are strictly restricted to the OWNER role.'
        }
      });
    }

    const { direction, amount: rawAmount, description, isOpeningBalance = false } = req.body;

    const amount = roundCurrency(rawAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Adjustment amount must be greater than zero.' }
      });
    }

    if (!direction || !['DEBIT', 'CREDIT'].includes(direction)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DIRECTION', message: 'Direction must be either DEBIT or CREDIT.' }
      });
    }

    if (!description || !String(description).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'DESCRIPTION_REQUIRED', message: 'A documented explanation / reason is mandatory.' }
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' }
      });
    }

    const entryType = isOpeningBalance ? 'OPENING_BALANCE' : 'ADJUSTMENT';
    const referenceNumber = `ADJ-${Date.now().toString().slice(-6)}`;

    const ledgerEntry = new CustomerLedgerEntry({
      customerId: customer._id,
      entryType,
      direction,
      amount,
      sourceType: isOpeningBalance ? 'MIGRATION' : 'ADJUSTMENT',
      sourceId: null,
      referenceNumber,
      description: String(description).trim(),
      createdBy: req.user._id,
      createdAt: new Date()
    });

    await ledgerEntry.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: 'OWNER',
      actorName: req.user.fullName,
      action: 'LEDGER_ADJUSTMENT_RECORDED',
      entityType: 'CustomerLedgerEntry',
      entityId: ledgerEntry._id,
      diff: {
        before: null,
        after: {
          customerId: customer._id,
          direction,
          amount,
          entryType,
          description: String(description).trim()
        }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(201).json({
      success: true,
      message: `${isOpeningBalance ? 'Opening balance' : 'Adjustment'} of ₹${amount.toFixed(2)} (${direction}) recorded in customer khatta.`,
      data: {
        ...ledgerEntry.toObject(),
        entry: ledgerEntry
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 13. OUTSTANDING DUES (GET /api/v1/billing/outstanding)
// ==========================================
export async function getOutstandingDues(req, res, next) {
  try {
    const { search } = req.query;
    const filter = {
      invoiceStatus: 'ISSUED',
      paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID'] },
      balanceDue: { $gt: 0 }
    };

    if (search && search.trim()) {
      const safe = escapeRegex(search.trim());
      filter.$or = [
        { invoiceNumber: { $regex: safe, $options: 'i' } },
        { 'customerSnapshot.fullName': { $regex: safe, $options: 'i' } },
        { 'customerSnapshot.mobileNumber': { $regex: safe, $options: 'i' } },
        { 'vehicleSnapshot.registrationNumber': { $regex: safe, $options: 'i' } }
      ];
    }

    const invoices = await Invoice.find(filter)
      .sort({ issueDate: 1 })
      .populate('customerId', 'fullName mobileNumber')
      .populate('vehicleId', 'brand model registrationNumberDisplay')
      .lean();

    const now = Date.now();
    const dues = invoices.map((inv) => {
      const issueTime = inv.issueDate ? new Date(inv.issueDate).getTime() : new Date(inv.createdAt).getTime();
      const daysOutstanding = Math.max(0, Math.floor((now - issueTime) / 86400000));

      return {
        _id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId?._id || inv.customerId,
        customerName: inv.customerSnapshot?.fullName || inv.customerId?.fullName || 'Customer',
        customerMobile: inv.customerSnapshot?.mobileNumber || inv.customerId?.mobileNumber || '',
        vehiclePlate: inv.vehicleSnapshot?.registrationNumber || 'PROVISIONAL',
        vehicleModel: `${inv.vehicleSnapshot?.brand || ''} ${inv.vehicleSnapshot?.model || ''}`.trim(),
        jobCardNumber: inv.jobCardSnapshot?.jobCardNumber || '',
        issueDate: inv.issueDate || inv.createdAt,
        grandTotal: inv.grandTotal,
        amountPaid: inv.amountPaid,
        balanceDue: inv.balanceDue,
        outstandingAmount: inv.balanceDue,
        daysOutstanding,
        paymentStatus: inv.paymentStatus
      };
    });

    // Also include customers who have positive net ledger balances from adjustments or opening balances
    try {
      const ledgerAgg = await CustomerLedgerEntry.aggregate([
        {
          $group: {
            _id: '$customerId',
            totalDebit: { $sum: { $cond: [{ $eq: ['$direction', 'DEBIT'] }, '$amount', 0] } },
            totalCredit: { $sum: { $cond: [{ $eq: ['$direction', 'CREDIT'] }, '$amount', 0] } },
            earliestDate: { $min: '$createdAt' }
          }
        },
        {
          $project: {
            netBalance: { $subtract: ['$totalDebit', '$totalCredit'] },
            earliestDate: 1
          }
        },
        {
          $match: {
            netBalance: { $gt: 0 }
          }
        }
      ]);

      const customerMap = {};
      dues.forEach((d) => {
        const cId = d.customerId ? d.customerId.toString() : '';
        if (cId) customerMap[cId] = true;
      });

      for (const item of ledgerAgg) {
        const cIdStr = item._id.toString();
        if (!customerMap[cIdStr]) {
          const cust = await Customer.findById(item._id).select('fullName mobileNumber city').lean();
          if (cust) {
            const days = Math.max(0, Math.floor((now - new Date(item.earliestDate).getTime()) / 86400000));
            dues.push({
              _id: `ledger-${cIdStr}`,
              customerId: cust._id,
              customerName: cust.fullName,
              customerMobile: cust.mobileNumber,
              vehiclePlate: 'KHATTA ACCOUNT',
              vehicleModel: 'Ledger Dues',
              jobCardNumber: 'KHATTA',
              issueDate: item.earliestDate,
              grandTotal: roundCurrency(item.netBalance),
              amountPaid: 0,
              balanceDue: roundCurrency(item.netBalance),
              outstandingAmount: roundCurrency(item.netBalance),
              daysOutstanding: days,
              paymentStatus: 'UNPAID'
            });
          }
        }
      }
    } catch (aggErr) {
      console.warn('Ledger dues aggregation notice:', aggErr.message);
    }

    const totalAmount = roundCurrency(dues.reduce((sum, d) => sum + (d.outstandingAmount || d.balanceDue || 0), 0));

    return res.status(200).json({
      success: true,
      data: {
        customers: dues,
        summary: {
          totalOutstanding: totalAmount,
          totalCount: dues.length
        }
      },
      customers: dues,
      dues,
      totalOutstandingDuesCount: dues.length,
      totalOutstandingAmount: totalAmount
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 14. FINANCIAL DASHBOARD KPIS (GET /api/v1/billing/stats)
// ==========================================
export async function getBillingStats(req, res, next) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Month Invoiced: sum of issued invoices created this month
    const monthInvoices = await Invoice.find({
      invoiceStatus: 'ISSUED',
      createdAt: { $gte: monthStart }
    }).select('grandTotal');

    const totalInvoicedThisMonth = roundCurrency(
      monthInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
    );

    // Month Payments: sum of completed payments this month
    const monthPayments = await Payment.find({
      status: 'COMPLETED',
      paymentDate: { $gte: monthStart }
    }).select('amount');

    const paymentsReceivedThisMonth = roundCurrency(
      monthPayments.reduce((sum, p) => sum + p.amount, 0)
    );

    // Total outstanding customer dues across all active issued invoices
    const activeUnpaidInvoices = await Invoice.find({
      invoiceStatus: 'ISSUED',
      paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID'] }
    }).select('balanceDue paymentStatus');

    const totalOutstandingCustomerDues = roundCurrency(
      activeUnpaidInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0)
    );

    const unpaidInvoicesCount = activeUnpaidInvoices.filter((inv) => inv.paymentStatus === 'UNPAID').length;
    const partiallyPaidInvoicesCount = activeUnpaidInvoices.filter(
      (inv) => inv.paymentStatus === 'PARTIALLY_PAID'
    ).length;

    return res.status(200).json({
      success: true,
      data: {
        totalInvoicedThisMonth,
        totalPaymentsThisMonth: paymentsReceivedThisMonth,
        paymentsReceivedThisMonth,
        totalOutstandingDues: totalOutstandingCustomerDues,
        totalOutstandingCustomerDues,
        unpaidInvoicesCount,
        partiallyPaidInvoicesCount
      }
    });
  } catch (err) {
    next(err);
  }
}
