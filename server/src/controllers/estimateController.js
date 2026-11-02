import mongoose from 'mongoose';
import {
  ServiceEstimate,
  ESTIMATE_STATUSES,
  APPROVAL_SOURCES
} from '../models/ServiceEstimate.js';
import { JobCard } from '../models/JobCard.js';
import { Customer } from '../models/Customer.js';
import { createAuditRecord } from '../services/auditService.js';
import { calculateEstimateTotals } from '../utils/estimateCalculations.js';
import { isTransactionSupported } from '../config/db.js';

/**
 * Generates unique sequential estimate reference in format: EST-YYYYMMDD-XXXX
 */
async function generateEstimateNumber(session = null) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `EST-${dateStr}-`;

  const query = ServiceEstimate.findOne({ estimateNumber: new RegExp(`^${prefix}`) })
    .sort({ estimateNumber: -1 })
    .select('estimateNumber');

  if (session) {
    query.session(session);
  }

  const latest = await query.lean();
  let nextSeq = 1;
  if (latest && latest.estimateNumber) {
    const parts = latest.estimateNumber.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// ==========================================
// 1. GET ESTIMATES FOR JOB CARD (GET /job-cards/:id/estimates)
// ==========================================
export async function getEstimatesForJobCard(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Job Card ID format.' }
      });
    }

    const jobCard = await JobCard.findById(id);
    if (!jobCard) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job Card not found.' }
      });
    }

    const estimates = await ServiceEstimate.find({ jobCardId: id })
      .sort({ versionNumber: -1 })
      .populate('createdBy', 'fullName role email')
      .populate('customerDecision.recordedBy', 'fullName role email');

    return res.status(200).json({
      success: true,
      data: estimates
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 2. CREATE INITIAL ESTIMATE (POST /job-cards/:id/estimates)
// ==========================================
export async function createEstimateForJobCard(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Job Card ID format.' }
      });
    }

    const jobCard = await JobCard.findById(id);
    if (!jobCard) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job Card not found.' }
      });
    }

    if (['DELIVERED', 'CANCELLED'].includes(jobCard.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TERMINAL_JOB_CARD',
          message: `Cannot create an estimate for a Job Card in terminal state "${jobCard.status}".`
        }
      });
    }

    // Check if an active estimate already exists
    const existingActive = await ServiceEstimate.findOne({ jobCardId: id, isCurrent: true });
    if (existingActive) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CURRENT_ESTIMATE_EXISTS',
          message: `An active estimate (${existingActive.estimateNumber} v${existingActive.versionNumber}) already exists for this Job Card. Use revise to create a new version.`
        }
      });
    }

    const {
      items: rawItems,
      discountAmount = 0,
      taxRate = 0,
      customerMessage = '',
      internalNotes = '',
      expiresAt = null
    } = req.body;

    // Strict server-side calculations & validations
    let calculated;
    try {
      calculated = calculateEstimateTotals(rawItems, discountAmount, taxRate);
    } catch (calcErr) {
      return res.status(400).json({
        success: false,
        error: { code: 'CALCULATION_VALIDATION_ERROR', message: calcErr.message }
      });
    }

    const supportsTxn = await isTransactionSupported();
    let createdEstimate = null;

    if (supportsTxn) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          let saved = null;
          let attempts = 0;

          while (!saved && attempts < 5) {
            attempts++;
            const estimateNumber = await generateEstimateNumber(session);

            const doc = new ServiceEstimate({
              estimateNumber,
              jobCardId: jobCard._id,
              customerId: jobCard.customerId,
              vehicleId: jobCard.vehicleId,
              versionNumber: 1,
              isCurrent: true,
              items: calculated.items,
              subtotal: calculated.subtotal,
              discountAmount: calculated.discountAmount,
              taxRate: calculated.taxRate,
              taxAmount: calculated.taxAmount,
              grandTotal: calculated.grandTotal,
              customerMessage: String(customerMessage || '').trim(),
              internalNotes: String(internalNotes || '').trim(),
              status: 'DRAFT',
              createdBy: req.user._id,
              expiresAt: expiresAt ? new Date(expiresAt) : null
            });

            try {
              await doc.save({ session });
              saved = doc;
            } catch (err) {
              if (err.code === 11000 && attempts < 5) {
                continue;
              }
              throw err;
            }
          }

          createdEstimate = saved;

          // Update Job Card estimate pointers
          jobCard.currentEstimateId = createdEstimate._id;
          jobCard.estimateSummary = {
            estimateNumber: createdEstimate.estimateNumber,
            versionNumber: 1,
            grandTotal: createdEstimate.grandTotal,
            status: 'DRAFT',
            decision: null
          };
          await jobCard.save({ session });

          // Audit Log
          await createAuditRecord({
            actorId: req.user._id,
            actorRole: req.user.role,
            actorName: req.user.fullName,
            action: 'ESTIMATE_CREATED',
            entityType: 'ServiceEstimate',
            entityId: createdEstimate._id,
            diff: {
              before: null,
              after: {
                estimateNumber: createdEstimate.estimateNumber,
                versionNumber: 1,
                jobCardId: jobCard._id,
                grandTotal: createdEstimate.grandTotal,
                status: 'DRAFT'
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
      let saved = null;
      let attempts = 0;

      while (!saved && attempts < 5) {
        attempts++;
        const estimateNumber = await generateEstimateNumber(null);

        const doc = new ServiceEstimate({
          estimateNumber,
          jobCardId: jobCard._id,
          customerId: jobCard.customerId,
          vehicleId: jobCard.vehicleId,
          versionNumber: 1,
          isCurrent: true,
          items: calculated.items,
          subtotal: calculated.subtotal,
          discountAmount: calculated.discountAmount,
          taxRate: calculated.taxRate,
          taxAmount: calculated.taxAmount,
          grandTotal: calculated.grandTotal,
          customerMessage: String(customerMessage || '').trim(),
          internalNotes: String(internalNotes || '').trim(),
          status: 'DRAFT',
          createdBy: req.user._id,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        });

        try {
          await doc.save();
          saved = doc;
        } catch (err) {
          if (err.code === 11000 && attempts < 5) {
            continue;
          }
          throw err;
        }
      }

      createdEstimate = saved;

      jobCard.currentEstimateId = createdEstimate._id;
      jobCard.estimateSummary = {
        estimateNumber: createdEstimate.estimateNumber,
        versionNumber: 1,
        grandTotal: createdEstimate.grandTotal,
        status: 'DRAFT',
        decision: null
      };
      await jobCard.save();

      await createAuditRecord({
        actorId: req.user._id,
        actorRole: req.user.role,
        actorName: req.user.fullName,
        action: 'ESTIMATE_CREATED',
        entityType: 'ServiceEstimate',
        entityId: createdEstimate._id,
        diff: {
          before: null,
          after: {
            estimateNumber: createdEstimate.estimateNumber,
            versionNumber: 1,
            jobCardId: jobCard._id,
            grandTotal: createdEstimate.grandTotal,
            status: 'DRAFT'
          }
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-api'
      });
    }

    return res.status(201).json({
      success: true,
      message: `Estimate ${createdEstimate.estimateNumber} (v1) created successfully.`,
      data: createdEstimate
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 3. GET ESTIMATE BY ID (GET /estimates/:id)
// ==========================================
export async function getEstimateById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Estimate ID format.' }
      });
    }

    const estimate = await ServiceEstimate.findById(id)
      .populate('jobCardId')
      .populate('customerId')
      .populate('vehicleId')
      .populate('createdBy', 'fullName role email')
      .populate('customerDecision.recordedBy', 'fullName role email');

    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: { code: 'ESTIMATE_NOT_FOUND', message: 'Service Estimate not found.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: estimate
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 4. SEND ESTIMATE TO CUSTOMER (POST /estimates/:id/send)
// ==========================================
export async function sendEstimate(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Estimate ID format.' }
      });
    }

    const estimate = await ServiceEstimate.findById(id);
    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: { code: 'ESTIMATE_NOT_FOUND', message: 'Service Estimate not found.' }
      });
    }

    if (!estimate.isCurrent || ['APPROVED', 'PARTIALLY_APPROVED', 'SUPERSEDED', 'EXPIRED'].includes(estimate.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ESTIMATE_NOT_SENDABLE',
          message: `Cannot send estimate with status "${estimate.status}".`
        }
      });
    }

    const previousStatus = estimate.status;
    estimate.status = 'SENT';
    estimate.sentAt = new Date();

    if (req.body.expiresAt) {
      const exp = new Date(req.body.expiresAt);
      if (!isNaN(exp.getTime())) {
        estimate.expiresAt = exp;
      }
    }

    await estimate.save();

    // Advance Job Card to WAITING_FOR_APPROVAL if currently in INSPECTION
    const jobCard = await JobCard.findById(estimate.jobCardId);
    if (jobCard) {
      if (jobCard.status === 'INSPECTION') {
        jobCard.status = 'WAITING_FOR_APPROVAL';
        jobCard.statusTimeline.push({
          status: 'WAITING_FOR_APPROVAL',
          changedBy: req.user._id,
          role: req.user.role,
          notes: `Estimate ${estimate.estimateNumber} (v${estimate.versionNumber}) sent to customer for approval`,
          timestamp: new Date()
        });
      }
      jobCard.estimateSummary.status = 'SENT';
      await jobCard.save();
    }

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'ESTIMATE_SENT',
      entityType: 'ServiceEstimate',
      entityId: estimate._id,
      diff: {
        before: { status: previousStatus },
        after: { status: 'SENT', sentAt: estimate.sentAt }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: `Estimate ${estimate.estimateNumber} marked as SENT.`,
      data: estimate
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 5. REVISE ESTIMATE / ADDITIONAL WORK (POST /estimates/:id/revise)
// ==========================================
export async function reviseEstimate(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Estimate ID format.' }
      });
    }

    const currentEstimate = await ServiceEstimate.findById(id);
    if (!currentEstimate) {
      return res.status(404).json({
        success: false,
        error: { code: 'ESTIMATE_NOT_FOUND', message: 'Service Estimate not found.' }
      });
    }

    // Only current estimate can be revised
    if (!currentEstimate.isCurrent) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_REVISE_SUPERSEDED',
          message: 'Only the current active estimate version can be revised.'
        }
      });
    }

    const jobCard = await JobCard.findById(currentEstimate.jobCardId);
    if (!jobCard) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Associated Job Card not found.' }
      });
    }

    if (['DELIVERED', 'CANCELLED'].includes(jobCard.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TERMINAL_JOB_CARD',
          message: `Cannot revise estimate for a Job Card in terminal state "${jobCard.status}".`
        }
      });
    }

    const {
      items: rawItems,
      discountAmount = 0,
      taxRate = currentEstimate.taxRate || 0,
      customerMessage = currentEstimate.customerMessage || '',
      internalNotes = '',
      expiresAt = null
    } = req.body;

    let calculated;
    try {
      calculated = calculateEstimateTotals(rawItems, discountAmount, taxRate);
    } catch (calcErr) {
      return res.status(400).json({
        success: false,
        error: { code: 'CALCULATION_VALIDATION_ERROR', message: calcErr.message }
      });
    }

    const nextVersion = currentEstimate.versionNumber + 1;
    let newEstimateDoc = null;

    const supportsTxn = await isTransactionSupported();

    if (supportsTxn) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // Supersede current estimate
          currentEstimate.isCurrent = false;
          currentEstimate.status = 'SUPERSEDED';
          await currentEstimate.save({ session });

          newEstimateDoc = new ServiceEstimate({
            estimateNumber: currentEstimate.estimateNumber,
            jobCardId: jobCard._id,
            customerId: jobCard.customerId,
            vehicleId: jobCard.vehicleId,
            versionNumber: nextVersion,
            isCurrent: true,
            items: calculated.items,
            subtotal: calculated.subtotal,
            discountAmount: calculated.discountAmount,
            taxRate: calculated.taxRate,
            taxAmount: calculated.taxAmount,
            grandTotal: calculated.grandTotal,
            customerMessage: String(customerMessage || '').trim(),
            internalNotes: String(internalNotes || '').trim(),
            status: 'DRAFT',
            createdBy: req.user._id,
            expiresAt: expiresAt ? new Date(expiresAt) : null
          });

          await newEstimateDoc.save({ session });

          // Point Job Card to new version
          jobCard.currentEstimateId = newEstimateDoc._id;
          jobCard.estimateSummary = {
            estimateNumber: newEstimateDoc.estimateNumber,
            versionNumber: nextVersion,
            grandTotal: newEstimateDoc.grandTotal,
            status: 'DRAFT',
            decision: null
          };
          await jobCard.save({ session });

          await createAuditRecord({
            actorId: req.user._id,
            actorRole: req.user.role,
            actorName: req.user.fullName,
            action: 'ESTIMATE_REVISED',
            entityType: 'ServiceEstimate',
            entityId: newEstimateDoc._id,
            diff: {
              before: {
                versionNumber: currentEstimate.versionNumber,
                status: 'SUPERSEDED',
                grandTotal: currentEstimate.grandTotal
              },
              after: {
                versionNumber: nextVersion,
                status: 'DRAFT',
                grandTotal: newEstimateDoc.grandTotal
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
      currentEstimate.isCurrent = false;
      currentEstimate.status = 'SUPERSEDED';
      await currentEstimate.save();

      newEstimateDoc = new ServiceEstimate({
        estimateNumber: currentEstimate.estimateNumber,
        jobCardId: jobCard._id,
        customerId: jobCard.customerId,
        vehicleId: jobCard.vehicleId,
        versionNumber: nextVersion,
        isCurrent: true,
        items: calculated.items,
        subtotal: calculated.subtotal,
        discountAmount: calculated.discountAmount,
        taxRate: calculated.taxRate,
        taxAmount: calculated.taxAmount,
        grandTotal: calculated.grandTotal,
        customerMessage: String(customerMessage || '').trim(),
        internalNotes: String(internalNotes || '').trim(),
        status: 'DRAFT',
        createdBy: req.user._id,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      });

      await newEstimateDoc.save();

      jobCard.currentEstimateId = newEstimateDoc._id;
      jobCard.estimateSummary = {
        estimateNumber: newEstimateDoc.estimateNumber,
        versionNumber: nextVersion,
        grandTotal: newEstimateDoc.grandTotal,
        status: 'DRAFT',
        decision: null
      };
      await jobCard.save();

      await createAuditRecord({
        actorId: req.user._id,
        actorRole: req.user.role,
        actorName: req.user.fullName,
        action: 'ESTIMATE_REVISED',
        entityType: 'ServiceEstimate',
        entityId: newEstimateDoc._id,
        diff: {
          before: {
            versionNumber: currentEstimate.versionNumber,
            status: 'SUPERSEDED',
            grandTotal: currentEstimate.grandTotal
          },
          after: {
            versionNumber: nextVersion,
            status: 'DRAFT',
            grandTotal: newEstimateDoc.grandTotal
          }
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-api'
      });
    }

    return res.status(201).json({
      success: true,
      message: `Estimate ${newEstimateDoc.estimateNumber} revised to Version ${nextVersion}. Fresh customer approval required.`,
      data: newEstimateDoc
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 6. RECORD CUSTOMER DECISION (POST /estimates/:id/decision)
// ==========================================
export async function recordEstimateDecision(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Estimate ID format.' }
      });
    }

    const {
      decision,
      approvalSource,
      customerComment = '',
      approvedItemIndices = []
    } = req.body;

    const allowedDecisions = ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'];
    if (!decision || !allowedDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DECISION',
          message: `Decision must be one of: ${allowedDecisions.join(', ')}`
        }
      });
    }

    if (!approvalSource || !APPROVAL_SOURCES.includes(approvalSource)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_APPROVAL_SOURCE',
          message: `Approval source must be one of: ${APPROVAL_SOURCES.join(', ')}`
        }
      });
    }

    const estimate = await ServiceEstimate.findById(id);
    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: { code: 'ESTIMATE_NOT_FOUND', message: 'Service Estimate not found.' }
      });
    }

    // Must be the current active version
    if (!estimate.isCurrent || estimate.status === 'SUPERSEDED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DECIDE_SUPERSEDED',
          message: 'Cannot record customer decision on a superseded or inactive estimate version.'
        }
      });
    }

    // Prevent duplicate decisions
    if (['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'].includes(estimate.status) || estimate.customerDecision?.decision) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ESTIMATE_ALREADY_DECIDED',
          message: `A customer decision (${estimate.status}) has already been recorded for this estimate.`
        }
      });
    }

    const totalItems = estimate.items.length;
    let finalApprovedIndices = [];
    let finalRejectedIndices = [];

    if (decision === 'APPROVED') {
      estimate.items.forEach((item) => {
        item.status = 'APPROVED';
      });
      finalApprovedIndices = estimate.items.map((_, i) => i);
    } else if (decision === 'REJECTED') {
      estimate.items.forEach((item) => {
        item.status = 'REJECTED';
      });
      finalRejectedIndices = estimate.items.map((_, i) => i);
    } else if (decision === 'PARTIALLY_APPROVED') {
      if (!Array.isArray(approvedItemIndices) || approvedItemIndices.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PARTIAL_ITEMS_REQUIRED',
            message: 'Partial approval requires specifying at least one approved item index.'
          }
        });
      }

      // Validate indices
      const validIndices = approvedItemIndices.filter(
        (i) => typeof i === 'number' && i >= 0 && i < totalItems
      );

      if (validIndices.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ITEM_INDICES', message: 'Specified item indices are out of range.' }
        });
      }

      if (validIndices.length === totalItems) {
        // All items selected -> treat as full APPROVED
        estimate.items.forEach((item) => {
          item.status = 'APPROVED';
        });
        finalApprovedIndices = validIndices;
      } else {
        estimate.items.forEach((item, idx) => {
          if (validIndices.includes(idx)) {
            item.status = 'APPROVED';
            finalApprovedIndices.push(idx);
          } else {
            item.status = 'REJECTED';
            finalRejectedIndices.push(idx);
          }
        });
      }
    }

    // Lookup customer for contact details
    const customer = await Customer.findById(estimate.customerId);

    estimate.customerDecision = {
      decision,
      decisionTimestamp: new Date(),
      approvalSource,
      customerName: customer ? customer.fullName : 'Customer',
      customerMobile: customer ? customer.mobileNumber : '',
      customerComment: String(customerComment || '').trim(),
      recordedBy: req.user._id,
      approvedItemIndices: finalApprovedIndices,
      rejectedItemIndices: finalRejectedIndices
    };

    estimate.status = decision;
    await estimate.save();

    // Update Job Card summary
    const jobCard = await JobCard.findById(estimate.jobCardId);
    if (jobCard) {
      jobCard.estimateSummary = {
        estimateNumber: estimate.estimateNumber,
        versionNumber: estimate.versionNumber,
        grandTotal: estimate.grandTotal,
        status: decision,
        decision
      };

      // Status timeline note on Job Card
      jobCard.statusTimeline.push({
        status: jobCard.status,
        changedBy: req.user._id,
        role: req.user.role,
        notes: `Customer ${decision} estimate ${estimate.estimateNumber} v${estimate.versionNumber} via ${approvalSource}${customerComment ? `: "${customerComment}"` : ''}`,
        timestamp: new Date()
      });

      await jobCard.save();
    }

    const actionMap = {
      APPROVED: 'ESTIMATE_APPROVED',
      PARTIALLY_APPROVED: 'ESTIMATE_PARTIALLY_APPROVED',
      REJECTED: 'ESTIMATE_REJECTED'
    };

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: actionMap[decision],
      entityType: 'ServiceEstimate',
      entityId: estimate._id,
      diff: {
        before: { status: 'SENT', decision: null },
        after: {
          status: decision,
          decision,
          approvalSource,
          approvedItemsCount: finalApprovedIndices.length,
          rejectedItemsCount: finalRejectedIndices.length,
          customerComment
        }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: `Customer decision (${decision}) recorded successfully.`,
      data: estimate
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 7. RECORD NO-ESTIMATE WORK EXCEPTION (POST /estimates/:id/record-exception and /job-cards/:id/record-exception)
// ==========================================
export async function recordNoEstimateException(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid ID format.' }
      });
    }

    // OWNER ONLY authorization check
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_OWNER_ONLY',
          message: 'Authorizing workshop work without a customer-approved estimate is strictly restricted to the OWNER role.'
        }
      });
    }

    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EXCEPTION_REASON_REQUIRED',
          message: 'A documented operational justification / reason is mandatory when authorizing a no-estimate exception.'
        }
      });
    }

    // Try finding by Job Card ID first, or by Estimate ID
    let jobCard = await JobCard.findById(id);
    if (!jobCard) {
      const estimate = await ServiceEstimate.findById(id);
      if (estimate) {
        jobCard = await JobCard.findById(estimate.jobCardId);
      }
    }

    if (!jobCard) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Target Job Card record not found.' }
      });
    }

    jobCard.noEstimateException = {
      isAuthorized: true,
      authorizedBy: req.user._id,
      reason: String(reason).trim(),
      authorizedAt: new Date()
    };

    jobCard.statusTimeline.push({
      status: jobCard.status,
      changedBy: req.user._id,
      role: 'OWNER',
      notes: `OWNER Authorized No-Estimate Exception: "${String(reason).trim()}"`,
      timestamp: new Date()
    });

    await jobCard.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: 'OWNER',
      actorName: req.user.fullName,
      action: 'NO_ESTIMATE_EXCEPTION_AUTHORIZED',
      entityType: 'JobCard',
      entityId: jobCard._id,
      diff: {
        before: { noEstimateException: null },
        after: {
          isAuthorized: true,
          authorizedBy: req.user._id,
          reason: String(reason).trim()
        }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: 'No-estimate work exception authorized and audited successfully.',
      data: jobCard
    });
  } catch (err) {
    next(err);
  }
}
