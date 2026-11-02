import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Printer,
  History,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  Trash2,
  Wrench,
  DollarSign
} from 'lucide-react';
import {
  fetchEstimatesForJobCard,
  createEstimateForJobCard,
  sendEstimate,
  reviseEstimate,
  recordEstimateDecision,
  recordNoEstimateException
} from '../../utils/api';

const ITEM_TYPES = [
  { value: 'SERVICE', label: 'Service' },
  { value: 'LABOUR', label: 'Labour' },
  { value: 'PART', label: 'Spare Part' },
  { value: 'OTHER', label: 'Other / Misc' }
];

const APPROVAL_SOURCES = [
  { value: 'IN_PERSON', label: 'In Person (Walk-in at Workshop)' },
  { value: 'PHONE', label: 'Phone Call (Spoke to Customer)' },
  { value: 'WHATSAPP', label: 'WhatsApp Message / Chat' },
  { value: 'OTHER', label: 'Other Verified Communication' }
];

export default function EstimateManager({ jobCard, onJobCardUpdated, isOwner = false }) {
  const [estimates, setEstimates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals state
  const [showBuilder, setShowBuilder] = useState(false);
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoricalEstimate, setSelectedHistoricalEstimate] = useState(null);
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  // Builder Form State
  const [builderItems, setBuilderItems] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(18); // default 18% GST or 0%
  const [customerMessage, setCustomerMessage] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmittingBuilder, setIsSubmittingBuilder] = useState(false);
  const [builderError, setBuilderError] = useState('');

  // Decision Form State
  const [decision, setDecision] = useState('APPROVED');
  const [approvalSource, setApprovalSource] = useState('WHATSAPP');
  const [customerComment, setCustomerComment] = useState('');
  const [approvedIndices, setApprovedIndices] = useState([]);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState('');

  // Exception Form State
  const [exceptionReason, setExceptionReason] = useState('');
  const [isSubmittingException, setIsSubmittingException] = useState(false);
  const [exceptionError, setExceptionError] = useState('');

  // Load estimates for this job card
  const loadEstimates = useCallback(async () => {
    if (!jobCard?._id) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchEstimatesForJobCard(jobCard._id);
      setEstimates(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load estimates.');
    } finally {
      setIsLoading(false);
    }
  }, [jobCard?._id]);

  useEffect(() => {
    loadEstimates();
  }, [loadEstimates]);

  // Current active estimate is the latest version with isCurrent === true, or first in array
  const currentEstimate = estimates.find((e) => e.isCurrent) || estimates[0] || null;

  // Initialize Builder for new estimate or revision
  const handleOpenBuilder = (isRevision = false) => {
    setIsRevisionMode(isRevision);
    setBuilderError('');

    if (isRevision && currentEstimate) {
      // Pre-fill with current estimate items
      setBuilderItems(
        currentEstimate.items.map((it) => ({
          serviceId: it.serviceId || null,
          itemName: it.itemName,
          description: it.description || '',
          quantity: it.quantity,
          unit: it.unit || 'job',
          unitPrice: it.unitPrice,
          itemType: it.itemType || 'SERVICE'
        }))
      );
      setDiscountAmount(currentEstimate.discountAmount || 0);
      setTaxRate(currentEstimate.taxRate || 0);
      setCustomerMessage(currentEstimate.customerMessage || '');
      setInternalNotes(currentEstimate.internalNotes || '');
    } else {
      // Pre-fill from Job Card requested services if any
      const initialItems = (jobCard.requestedServices || []).map((s) => ({
        serviceId: s.serviceId || null,
        itemName: s.name || 'General Service',
        description: s.category ? `Category: ${s.category}` : '',
        quantity: 1,
        unit: 'job',
        unitPrice: s.price || 0,
        itemType: 'SERVICE'
      }));

      if (initialItems.length === 0) {
        initialItems.push({
          serviceId: null,
          itemName: 'General Inspection & Service Labour',
          description: '',
          quantity: 1,
          unit: 'job',
          unitPrice: 500,
          itemType: 'LABOUR'
        });
      }

      setBuilderItems(initialItems);
      setDiscountAmount(0);
      setTaxRate(18);
      setCustomerMessage('Thank you for trusting Mahadev Mechanical Car Garage. Here is your initial service estimate.');
      setInternalNotes('');
    }

    setShowBuilder(true);
  };

  // Add Item to Builder
  const handleAddItem = (type = 'SERVICE') => {
    const defaultLabels = {
      SERVICE: 'Periodic Maintenance Service',
      LABOUR: 'Mechanical Labour Charge',
      PART: 'Spare Part / Consumable',
      OTHER: 'Miscellaneous Workshop Item'
    };
    const defaultUnits = {
      SERVICE: 'job',
      LABOUR: 'job',
      PART: 'pc',
      OTHER: 'unit'
    };
    setBuilderItems([
      ...builderItems,
      {
        serviceId: null,
        itemName: defaultLabels[type] || 'New Item',
        description: '',
        quantity: 1,
        unit: defaultUnits[type] || 'job',
        unitPrice: 0,
        itemType: type
      }
    ]);
  };

  const handleUpdateItem = (index, field, value) => {
    const next = [...builderItems];
    next[index] = { ...next[index], [field]: value };
    setBuilderItems(next);
  };

  const handleRemoveItem = (index) => {
    if (builderItems.length <= 1) {
      setBuilderError('Estimate must contain at least one line item.');
      return;
    }
    setBuilderItems(builderItems.filter((_, idx) => idx !== index));
  };

  // Calculate safe preview totals
  const subtotalPreview = builderItems.reduce((acc, it) => {
    const q = Math.max(0, Number(it.quantity) || 0);
    const p = Math.max(0, Number(it.unitPrice) || 0);
    return acc + q * p;
  }, 0);
  const cleanSubtotal = Math.round(subtotalPreview * 100) / 100;
  const cleanDiscount = Math.min(cleanSubtotal, Math.max(0, Number(discountAmount) || 0));
  const cleanTaxable = Math.max(0, cleanSubtotal - cleanDiscount);
  const cleanTaxRate = Math.min(100, Math.max(0, Number(taxRate) || 0));
  const cleanTaxAmount = Math.round(cleanTaxable * (cleanTaxRate / 100) * 100) / 100;
  const cleanGrandTotal = Math.round((cleanTaxable + cleanTaxAmount) * 100) / 100;

  // Submit Builder
  const handleSaveEstimate = async (e) => {
    e.preventDefault();
    setBuilderError('');

    // Validation
    for (let i = 0; i < builderItems.length; i++) {
      const it = builderItems[i];
      if (!it.itemName || !it.itemName.trim()) {
        setBuilderError(`Line item #${i + 1} requires a valid item name.`);
        return;
      }
      if (Number(it.quantity) <= 0) {
        setBuilderError(`Item "${it.itemName}" quantity must be greater than zero.`);
        return;
      }
      if (Number(it.unitPrice) < 0) {
        setBuilderError(`Item "${it.itemName}" unit price cannot be negative.`);
        return;
      }
    }

    if (cleanDiscount > cleanSubtotal) {
      setBuilderError(`Discount (₹${cleanDiscount}) cannot exceed subtotal (₹${cleanSubtotal}).`);
      return;
    }

    setIsSubmittingBuilder(true);
    try {
      const payload = {
        items: builderItems.map((it) => ({
          serviceId: it.serviceId || undefined,
          itemName: it.itemName.trim(),
          description: (it.description || '').trim(),
          quantity: Number(it.quantity),
          unit: it.unit || 'job',
          unitPrice: Number(it.unitPrice),
          itemType: it.itemType || 'SERVICE'
        })),
        discountAmount: cleanDiscount,
        taxRate: cleanTaxRate,
        customerMessage: customerMessage.trim(),
        internalNotes: internalNotes.trim(),
        expiresAt: expiresAt || null
      };

      if (isRevisionMode && currentEstimate) {
        await reviseEstimate(currentEstimate._id, payload);
        setActionSuccess(`Estimate revised to new version successfully. Fresh customer approval required.`);
      } else {
        await createEstimateForJobCard(jobCard._id, payload);
        setActionSuccess(`Estimate created successfully.`);
      }

      setShowBuilder(false);
      await loadEstimates();
      if (onJobCardUpdated) onJobCardUpdated();
    } catch (err) {
      setBuilderError(err.message || 'Failed to save estimate.');
    } finally {
      setIsSubmittingBuilder(false);
    }
  };

  // Send Estimate to Customer
  const handleSendEstimate = async () => {
    if (!currentEstimate) return;
    setError('');
    setActionSuccess('');
    try {
      await sendEstimate(currentEstimate._id);
      setActionSuccess(`Estimate ${currentEstimate.estimateNumber} marked as SENT. Job Card updated to WAITING_FOR_APPROVAL.`);
      await loadEstimates();
      if (onJobCardUpdated) onJobCardUpdated();
    } catch (err) {
      setError(err.message || 'Failed to send estimate.');
    }
  };

  // Open Decision Modal
  const handleOpenDecision = () => {
    if (!currentEstimate) return;
    setDecision('APPROVED');
    setApprovalSource('WHATSAPP');
    setCustomerComment('');
    // Pre-select all item indices
    setApprovedIndices(currentEstimate.items.map((_, i) => i));
    setDecisionError('');
    setShowDecisionModal(true);
  };

  // Toggle item checkbox for partial approval
  const toggleItemApproval = (idx) => {
    if (approvedIndices.includes(idx)) {
      setApprovedIndices(approvedIndices.filter((i) => i !== idx));
    } else {
      setApprovedIndices([...approvedIndices, idx]);
    }
  };

  // Submit Customer Decision
  const handleSaveDecision = async (e) => {
    e.preventDefault();
    if (!currentEstimate) return;
    setDecisionError('');

    if (decision === 'PARTIALLY_APPROVED' && approvedIndices.length === 0) {
      setDecisionError('Please select at least one item to partially approve.');
      return;
    }

    setIsSubmittingDecision(true);
    try {
      await recordEstimateDecision(currentEstimate._id, {
        decision,
        approvalSource,
        customerComment: customerComment.trim(),
        approvedItemIndices: decision === 'PARTIALLY_APPROVED' ? approvedIndices : []
      });

      setActionSuccess(`Customer decision (${decision}) recorded successfully.`);
      setShowDecisionModal(false);
      await loadEstimates();
      if (onJobCardUpdated) onJobCardUpdated();
    } catch (err) {
      setDecisionError(err.message || 'Failed to record customer decision.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Submit OWNER No-Estimate Exception
  const handleSaveException = async (e) => {
    e.preventDefault();
    if (!exceptionReason.trim()) {
      setExceptionError('A valid operational justification reason is required.');
      return;
    }

    setIsSubmittingException(true);
    setExceptionError('');
    try {
      const targetId = currentEstimate ? currentEstimate._id : jobCard._id;
      await recordNoEstimateException(targetId, { reason: exceptionReason.trim() });
      setActionSuccess('OWNER no-estimate work exception recorded and audited successfully.');
      setShowExceptionModal(false);
      if (onJobCardUpdated) onJobCardUpdated();
    } catch (err) {
      setExceptionError(err.message || 'Failed to record exception.');
    } finally {
      setIsSubmittingException(false);
    }
  };

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Printable Estimate Doc (Current or Selected Historical)
  const estimateToPrint = selectedHistoricalEstimate || currentEstimate;

  return (
    <div className="estimate-management-section mt-4">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className="text-red-600" size={18} />
          <h4 className="font-bold text-slate-800 text-sm md:text-base">
            Service Estimates & Customer Approval (Phase 6)
          </h4>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {estimates.length > 0 && (
            <>
              <button
                type="button"
                className="btn btn-outline-dark btn-sm text-xs flex items-center gap-1.5"
                onClick={() => setShowHistoryModal(true)}
              >
                <History size={14} />
                <span>History ({estimates.length})</span>
              </button>

              <button
                type="button"
                className="btn btn-outline-dark btn-sm text-xs flex items-center gap-1.5"
                onClick={() => {
                  setSelectedHistoricalEstimate(null);
                  setShowPrintModal(true);
                }}
              >
                <Printer size={14} />
                <span>Print Estimate</span>
              </button>
            </>
          )}

          {/* Create initial estimate if none exists */}
          {estimates.length === 0 && (
            <button
              type="button"
              className="btn btn-primary btn-sm text-xs flex items-center gap-1.5"
              onClick={() => handleOpenBuilder(false)}
            >
              <Plus size={14} />
              <span>Create Initial Estimate</span>
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="admin-alert-banner alert-danger text-xs mb-3">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="admin-alert-banner alert-success text-xs mb-3">
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* NO ESTIMATES STATE */}
      {estimates.length === 0 && !isLoading && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
          <p className="text-xs text-slate-600 mb-2">
            No service estimate has been generated for this Job Card yet.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-primary btn-sm text-xs"
              onClick={() => handleOpenBuilder(false)}
            >
              <Plus size={14} className="mr-1 inline" />
              Prepare Detailed Estimate
            </button>

            {isOwner && (
              <button
                type="button"
                className="btn btn-outline-red btn-sm text-xs"
                onClick={() => {
                  setExceptionReason('');
                  setShowExceptionModal(true);
                }}
              >
                <ShieldAlert size={14} className="mr-1 inline" />
                Record OWNER No-Estimate Exception
              </button>
            )}
          </div>
        </div>
      )}

      {/* CURRENT ESTIMATE SUMMARY CARD */}
      {currentEstimate && (
        <div className="estimate-summary-container">
          {/* Header Row */}
          <div className="estimate-summary-header">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="estimate-hero-num">{currentEstimate.estimateNumber}</span>
                <span className="estimate-version-tag">Version {currentEstimate.versionNumber}</span>
                <span className={`badge-estimate-${currentEstimate.status.toLowerCase()} px-2 py-0.5 rounded text-xs font-bold`}>
                  {currentEstimate.status}
                </span>
                {currentEstimate.isCurrent && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    CURRENT
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                <span>Created: {new Date(currentEstimate.createdAt).toLocaleString('en-IN')}</span>
                {currentEstimate.sentAt && (
                  <span>Sent: {new Date(currentEstimate.sentAt).toLocaleString('en-IN')}</span>
                )}
                {currentEstimate.expiresAt && (
                  <span>Expires: {new Date(currentEstimate.expiresAt).toLocaleDateString('en-IN')}</span>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 block">Estimate Grand Total:</span>
              <span className="estimate-grand-total-callout">
                ₹{currentEstimate.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="estimate-table">
              <thead>
                <tr>
                  <th className="w-8">#</th>
                  <th>Item / Service</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Unit Price (₹)</th>
                  <th className="text-right">Line Total (₹)</th>
                  <th className="text-center">Approval Status</th>
                </tr>
              </thead>
              <tbody>
                {currentEstimate.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td>
                      <div className="font-semibold text-slate-800 text-xs">{item.itemName}</div>
                      {item.description && <div className="text-[11px] text-slate-500">{item.description}</div>}
                    </td>
                    <td>
                      <span className={`item-type-badge item-type-${(item.itemType || 'SERVICE').toLowerCase()}`}>
                        {item.itemType}
                      </span>
                    </td>
                    <td className="text-slate-600 text-xs">{item.unit || 'job'}</td>
                    <td className="text-right text-xs font-semibold">{item.quantity}</td>
                    <td className="text-right text-xs">₹{item.unitPrice?.toFixed(2)}</td>
                    <td className="text-right text-xs font-bold text-slate-900">₹{item.lineTotal?.toFixed(2)}</td>
                    <td className="text-center">
                      {item.status === 'APPROVED' && (
                        <span className="text-emerald-700 font-bold text-[11px] flex items-center justify-center gap-1">
                          <CheckCircle2 size={13} /> Approved
                        </span>
                      )}
                      {item.status === 'REJECTED' && (
                        <span className="text-rose-700 font-bold text-[11px] flex items-center justify-center gap-1">
                          <XCircle size={13} /> Rejected
                        </span>
                      )}
                      {(!item.status || item.status === 'PENDING') && (
                        <span className="text-slate-500 text-[11px] flex items-center justify-center gap-1">
                          <Clock size={13} /> Pending Decision
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal & Tax Breakdown */}
          <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
            <div className="w-full max-w-xs text-xs space-y-1">
              <div className="estimate-calc-row">
                <span>Items Subtotal:</span>
                <span className="font-semibold">₹{currentEstimate.subtotal?.toFixed(2)}</span>
              </div>
              {currentEstimate.discountAmount > 0 && (
                <div className="estimate-calc-row text-emerald-700">
                  <span>Customer Discount:</span>
                  <span className="font-semibold">-₹{currentEstimate.discountAmount?.toFixed(2)}</span>
                </div>
              )}
              {currentEstimate.taxRate > 0 && (
                <div className="estimate-calc-row">
                  <span>Tax ({currentEstimate.taxRate}% GST):</span>
                  <span className="font-semibold">₹{currentEstimate.taxAmount?.toFixed(2)}</span>
                </div>
              )}
              <div className="estimate-calc-row total-row">
                <span>Grand Total:</span>
                <span className="text-red-700">₹{currentEstimate.grandTotal?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Decision Record Info (if recorded) */}
          {currentEstimate.customerDecision?.decision && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  Customer Decision Recorded:
                  <span className="text-red-700 font-mono">{currentEstimate.customerDecision.decision}</span>
                </span>
                <span className="text-slate-500 text-[11px]">
                  {new Date(currentEstimate.customerDecision.decisionTimestamp).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-[11px]">
                <div>
                  <strong>Decision Source:</strong> {currentEstimate.customerDecision.approvalSource} (Staff Recorded)
                </div>
                <div>
                  <strong>Recorded By:</strong> {currentEstimate.customerDecision.recordedBy?.fullName || 'Staff'}
                </div>
              </div>
              {currentEstimate.customerDecision.customerComment && (
                <div className="text-slate-700 italic bg-white p-2 rounded border border-slate-200">
                  "{currentEstimate.customerDecision.customerComment}"
                </div>
              )}
            </div>
          )}

          {/* ACTION BUTTONS TOOLBAR */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Send Estimate */}
              {['DRAFT'].includes(currentEstimate.status) && (
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm text-xs flex items-center gap-1.5"
                  onClick={handleSendEstimate}
                >
                  <Send size={14} />
                  <span>Send to Customer (Advance to Waiting Approval)</span>
                </button>
              )}

              {/* Record Decision */}
              {['DRAFT', 'SENT'].includes(currentEstimate.status) && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm text-xs flex items-center gap-1.5"
                  onClick={handleOpenDecision}
                >
                  <CheckCircle2 size={14} />
                  <span>Record Customer Decision</span>
                </button>
              )}

              {/* Revise Estimate (Additional Work) */}
              {['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'].includes(currentEstimate.status) && (
                <button
                  type="button"
                  className="btn btn-outline-red btn-sm text-xs flex items-center gap-1.5"
                  onClick={() => handleOpenBuilder(true)}
                >
                  <Plus size={14} />
                  <span>Revise Estimate (Additional Work / Scope Change)</span>
                </button>
              )}
            </div>

            {/* OWNER Exception button */}
            {isOwner && (
              <button
                type="button"
                className="btn btn-outline-dark btn-sm text-xs text-amber-700 border-amber-300"
                onClick={() => {
                  setExceptionReason('');
                  setShowExceptionModal(true);
                }}
                title="Authorize workshop work without estimate (Audited Exception)"
              >
                <ShieldAlert size={14} className="mr-1 inline" />
                OWNER Exception
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. ESTIMATE BUILDER / REVISION MODAL                           */}
      {/* ============================================================== */}
      {showBuilder && (
        <div className="admin-modal-backdrop" onClick={() => setShowBuilder(false)}>
          <div className="admin-modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {isRevisionMode
                  ? `Revise Estimate (Version ${currentEstimate ? currentEstimate.versionNumber + 1 : 2})`
                  : 'Detailed Service Estimate Builder'}
              </h3>
              <button className="modal-close-btn" onClick={() => setShowBuilder(false)}>×</button>
            </div>

            <form onSubmit={handleSaveEstimate}>
              <div className="modal-body space-y-4">
                {builderError && (
                  <div className="admin-alert-banner alert-danger text-xs">
                    <AlertCircle size={16} />
                    <span>{builderError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-700">Estimate Line Items:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm text-xs py-1"
                      onClick={() => handleAddItem('SERVICE')}
                    >
                      + Add Service
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm text-xs py-1"
                      onClick={() => handleAddItem('LABOUR')}
                    >
                      + Add Labour
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm text-xs py-1"
                      onClick={() => handleAddItem('PART')}
                    >
                      + Add Spare Part
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm text-xs py-1"
                      onClick={() => handleAddItem('OTHER')}
                    >
                      + Custom Item
                    </button>
                  </div>
                </div>

                {/* Items Inputs Table */}
                <div className="space-y-2">
                  {builderItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col md:flex-row gap-2 items-start md:items-center text-xs"
                    >
                      <span className="font-mono text-slate-400 w-5">{idx + 1}.</span>

                      <div className="flex-1 w-full md:w-auto">
                        <input
                          type="text"
                          className="login-input text-xs py-1.5"
                          placeholder="Item name (e.g. Engine Oil, Brake Pads)"
                          value={item.itemName}
                          onChange={(e) => handleUpdateItem(idx, 'itemName', e.target.value)}
                          required
                        />
                      </div>

                      <div className="w-28">
                        <select
                          className="login-input text-xs py-1.5"
                          value={item.itemType}
                          onChange={(e) => handleUpdateItem(idx, 'itemType', e.target.value)}
                        >
                          {ITEM_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-20">
                        <input
                          type="text"
                          className="login-input text-xs py-1.5"
                          placeholder="Unit"
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                        />
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          className="login-input text-xs py-1.5 text-right"
                          placeholder="Qty"
                          step="any"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                          required
                        />
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          className="login-input text-xs py-1.5 text-right"
                          placeholder="Unit Price ₹"
                          step="any"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(idx, 'unitPrice', e.target.value)}
                          required
                        />
                      </div>

                      <div className="w-28 text-right font-bold text-slate-800 py-1.5">
                        ₹{(Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitPrice) || 0)).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 p-1"
                        onClick={() => handleRemoveItem(idx)}
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Financial Controls Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div>
                    <label className="input-label text-xs">Discount Amount (₹):</label>
                    <input
                      type="number"
                      className="login-input text-xs py-1.5"
                      min="0"
                      max={cleanSubtotal}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="input-label text-xs">Tax Rate (% GST):</label>
                    <input
                      type="number"
                      className="login-input text-xs py-1.5"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="input-label text-xs">Estimate Expiration Date:</label>
                    <input
                      type="date"
                      className="login-input text-xs py-1.5"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                </div>

                {/* Safe Live Calculation Preview Box */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-semibold">₹{cleanSubtotal.toFixed(2)}</span>
                  </div>
                  {cleanDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount Applied:</span>
                      <span>-₹{cleanDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {cleanTaxRate > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax ({cleanTaxRate}% GST on ₹{cleanTaxable.toFixed(2)}):</span>
                      <span>₹{cleanTaxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-sm text-red-700">
                    <span>Estimated Grand Total:</span>
                    <span>₹{cleanGrandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Customer Message & Internal Notes */}
                <div className="space-y-2">
                  <div>
                    <label className="input-label text-xs">Customer-Facing Message:</label>
                    <textarea
                      className="login-input text-xs"
                      rows={2}
                      placeholder="Special instructions or warranty terms shown to customer..."
                      value={customerMessage}
                      onChange={(e) => setCustomerMessage(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="input-label text-xs">Internal Workshop Staff Notes:</label>
                    <textarea
                      className="login-input text-xs"
                      rows={2}
                      placeholder="Technician part codes, supplier quotes, bay instructions..."
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setShowBuilder(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingBuilder}
                >
                  {isSubmittingBuilder
                    ? 'Saving Estimate...'
                    : isRevisionMode
                    ? 'Create Revised Estimate Version'
                    : 'Save & Generate Estimate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. CUSTOMER DECISION RECORDING MODAL                           */}
      {/* ============================================================== */}
      {showDecisionModal && currentEstimate && (
        <div className="admin-modal-backdrop" onClick={() => setShowDecisionModal(false)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Customer Approval Decision</h3>
              <button className="modal-close-btn" onClick={() => setShowDecisionModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveDecision}>
              <div className="modal-body space-y-3">
                {decisionError && (
                  <div className="admin-alert-banner alert-danger text-xs">
                    <AlertCircle size={16} />
                    <span>{decisionError}</span>
                  </div>
                )}

                <div className="modal-explainer text-xs text-slate-600">
                  Record the customer's decision for <strong>{currentEstimate.estimateNumber}</strong> (v{currentEstimate.versionNumber}, ₹{currentEstimate.grandTotal?.toFixed(2)}).
                  Staff recorded evidence will be audited.
                </div>

                {/* Decision Choice Buttons */}
                <div className="decision-selector-group">
                  <button
                    type="button"
                    className={`decision-choice-btn ${decision === 'APPROVED' ? 'selected-approved' : ''}`}
                    onClick={() => setDecision('APPROVED')}
                  >
                    <CheckCircle2 size={20} className="text-emerald-600" />
                    <span>Full Approval</span>
                  </button>

                  <button
                    type="button"
                    className={`decision-choice-btn ${decision === 'PARTIALLY_APPROVED' ? 'selected-partial' : ''}`}
                    onClick={() => setDecision('PARTIALLY_APPROVED')}
                  >
                    <AlertCircle size={20} className="text-amber-600" />
                    <span>Partial Approval</span>
                  </button>

                  <button
                    type="button"
                    className={`decision-choice-btn ${decision === 'REJECTED' ? 'selected-rejected' : ''}`}
                    onClick={() => setDecision('REJECTED')}
                  >
                    <XCircle size={20} className="text-rose-600" />
                    <span>Rejected</span>
                  </button>
                </div>

                {/* If Partially Approved: Checkbox selection of items */}
                {decision === 'PARTIALLY_APPROVED' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2">
                    <strong className="block text-amber-900">
                      Select Approved Items (Unselected items will be marked as REJECTED):
                    </strong>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {currentEstimate.items.map((item, idx) => (
                        <label
                          key={idx}
                          className="flex items-center gap-2 p-1.5 bg-white rounded border border-amber-200 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={approvedIndices.includes(idx)}
                            onChange={() => toggleItemApproval(idx)}
                          />
                          <span className="flex-1 font-semibold text-slate-800">{item.itemName}</span>
                          <span className="text-slate-600">₹{item.lineTotal?.toFixed(2)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approval Source */}
                <div>
                  <label className="input-label text-xs">Customer Decision Source:</label>
                  <select
                    className="login-input text-xs py-1.5"
                    value={approvalSource}
                    onChange={(e) => setApprovalSource(e.target.value)}
                  >
                    {APPROVAL_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Customer Comment */}
                <div>
                  <label className="input-label text-xs">Customer Comment / Verbal Remarks:</label>
                  <textarea
                    className="login-input text-xs"
                    rows={2}
                    placeholder="e.g. 'Customer approved via WhatsApp voice note, requested completion by 5 PM'..."
                    value={customerComment}
                    onChange={(e) => setCustomerComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setShowDecisionModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingDecision}
                >
                  {isSubmittingDecision ? 'Saving Decision...' : 'Record Decision & Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. ESTIMATE VERSION HISTORY MODAL                             */}
      {/* ============================================================== */}
      {showHistoryModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="admin-modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Estimate Revision & Historical Audit Trail</h3>
              <button className="modal-close-btn" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>

            <div className="modal-body space-y-4">
              <p className="text-xs text-slate-600">
                All versions generated for Job Card <strong>{jobCard.jobCardNumber}</strong> are preserved immutably.
              </p>

              <div className="space-y-3">
                {estimates.map((est) => (
                  <div
                    key={est._id}
                    className={`p-3 border rounded-lg text-xs ${
                      est.isCurrent ? 'bg-white border-emerald-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-90'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{est.estimateNumber}</span>
                        <span className="estimate-version-tag">Version {est.versionNumber}</span>
                        <span className={`badge-estimate-${est.status.toLowerCase()} px-1.5 py-0.5 rounded text-[10px] font-bold`}>
                          {est.status}
                        </span>
                        {est.isCurrent && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1 py-0.5 rounded">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-sm text-red-700">
                        ₹{est.grandTotal?.toFixed(2)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-500 text-[11px] mb-2">
                      <div>Created: {new Date(est.createdAt).toLocaleString('en-IN')}</div>
                      <div>Created By: {est.createdBy?.fullName || 'Staff'}</div>
                      <div>Items: {est.items?.length || 0} line items</div>
                    </div>

                    {est.customerDecision?.decision && (
                      <div className="text-[11px] p-2 bg-slate-100 rounded border border-slate-200 text-slate-700">
                        <strong>Customer Decision:</strong> {est.customerDecision.decision} via {est.customerDecision.approvalSource} on {new Date(est.customerDecision.decisionTimestamp).toLocaleString('en-IN')}
                        {est.customerDecision.customerComment && (
                          <div className="italic mt-0.5">"{est.customerDecision.customerComment}"</div>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        className="btn btn-outline-dark btn-sm text-[11px] py-0.5 px-2"
                        onClick={() => {
                          setSelectedHistoricalEstimate(est);
                          setShowPrintModal(true);
                        }}
                      >
                        <Printer size={12} className="mr-1 inline" />
                        View / Print Version {est.versionNumber}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={() => setShowHistoryModal(false)}
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. PRINTABLE A4 ESTIMATE MODAL                                 */}
      {/* ============================================================== */}
      {showPrintModal && estimateToPrint && (
        <div className="admin-modal-backdrop" onClick={() => setShowPrintModal(false)}>
          <div
            className="admin-modal-card modal-lg printable-estimate-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '95vh' }}
          >
            <div className="modal-header no-print">
              <h3 className="modal-title">Print Preview — Service Estimate</h3>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-primary btn-sm text-xs" onClick={handlePrint}>
                  <Printer size={14} className="mr-1 inline" />
                  Print A4 Document
                </button>
                <button className="modal-close-btn" onClick={() => setShowPrintModal(false)}>×</button>
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
                    <div className="print-doc-title">SERVICE ESTIMATE</div>
                    <div className="print-doc-number">{estimateToPrint.estimateNumber}</div>
                    <div className="text-xs text-slate-500 font-bold mt-1">
                      Version {estimateToPrint.versionNumber} ({estimateToPrint.status})
                    </div>
                    <div className="text-xs text-slate-500">
                      Date: {new Date(estimateToPrint.createdAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Meta Grid: Customer & Vehicle */}
                <div className="print-meta-grid">
                  <div>
                    <strong className="block text-slate-900 mb-1 border-b pb-0.5">CUSTOMER DETAILS:</strong>
                    <p><strong>Name:</strong> {jobCard.customerSnapshot?.fullName}</p>
                    <p><strong>Phone:</strong> {jobCard.customerSnapshot?.mobileNumber}</p>
                    {jobCard.customerSnapshot?.address && (
                      <p><strong>Address:</strong> {jobCard.customerSnapshot.address}, {jobCard.customerSnapshot.city || 'Gohana'}</p>
                    )}
                    <p><strong>Job Card #:</strong> {jobCard.jobCardNumber}</p>
                  </div>
                  <div>
                    <strong className="block text-slate-900 mb-1 border-b pb-0.5">VEHICLE DETAILS:</strong>
                    <p><strong>Make & Model:</strong> {jobCard.vehicleSnapshot?.brand} {jobCard.vehicleSnapshot?.model}</p>
                    <p><strong>Plate / Reg:</strong> {jobCard.vehicleSnapshot?.registrationNumber || 'PROVISIONAL'}</p>
                    <p><strong>Fuel / Odometer:</strong> {jobCard.fuelLevel} | {jobCard.odometerReading} km</p>
                    <p><strong>Received:</strong> {new Date(jobCard.receivedAt || jobCard.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                {/* Estimate Table */}
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
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimateToPrint.items.map((it, idx) => (
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
                        <td className="text-center text-[10px] font-bold">
                          {it.status === 'APPROVED' ? 'APPROVED' : it.status === 'REJECTED' ? 'REJECTED' : 'PENDING'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals Box */}
                <div className="print-totals-box">
                  <table className="print-totals-table">
                    <tbody>
                      <tr>
                        <td>Subtotal:</td>
                        <td className="text-right font-semibold">₹{estimateToPrint.subtotal?.toFixed(2)}</td>
                      </tr>
                      {estimateToPrint.discountAmount > 0 && (
                        <tr>
                          <td>Discount:</td>
                          <td className="text-right font-semibold">-₹{estimateToPrint.discountAmount?.toFixed(2)}</td>
                        </tr>
                      )}
                      {estimateToPrint.taxRate > 0 && (
                        <tr>
                          <td>GST ({estimateToPrint.taxRate}%):</td>
                          <td className="text-right font-semibold">₹{estimateToPrint.taxAmount?.toFixed(2)}</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-slate-800 font-bold text-base">
                        <td>Grand Total:</td>
                        <td className="text-right text-red-700">₹{estimateToPrint.grandTotal?.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Customer Decision Stamp */}
                {estimateToPrint.customerDecision?.decision && (
                  <div className="mb-4 p-2.5 bg-slate-50 border border-slate-300 rounded text-xs">
                    <strong>Customer Decision Record:</strong> {estimateToPrint.customerDecision.decision} on {new Date(estimateToPrint.customerDecision.decisionTimestamp).toLocaleString('en-IN')} via {estimateToPrint.customerDecision.approvalSource}.
                    {estimateToPrint.customerDecision.customerComment && (
                      <span className="block italic text-slate-600 mt-0.5">Remarks: "{estimateToPrint.customerDecision.customerComment}"</span>
                    )}
                  </div>
                )}

                {/* Terms and Conditions */}
                <div className="print-terms-box">
                  <strong>Terms & Conditions:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    <li>This estimate is valid for 7 days from the date of issue.</li>
                    <li>Any unforeseen mechanical defects or parts required during disassembly will be quoted separately via revised estimate.</li>
                    <li>All replaced parts are available for customer inspection upon delivery.</li>
                    <li>Vehicle delivery is subject to road testing and final quality check approval.</li>
                  </ul>
                </div>

                {/* Signatures */}
                <div className="print-footer-signatures">
                  <div className="sig-block">
                    Customer Signature
                  </div>
                  <div className="sig-block">
                    Workshop Manager / Authorised Signatory
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer no-print">
              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={() => setShowPrintModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePrint}
              >
                <Printer size={14} className="mr-1 inline" />
                Print (A4)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. OWNER NO-ESTIMATE WORK EXCEPTION MODAL                      */}
      {/* ============================================================== */}
      {showExceptionModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowExceptionModal(false)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2 text-amber-700">
                <ShieldAlert size={20} />
                <span>OWNER Authorization: Proceed Without Estimate</span>
              </h3>
              <button className="modal-close-btn" onClick={() => setShowExceptionModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveException}>
              <div className="modal-body space-y-3">
                {exceptionError && (
                  <div className="admin-alert-banner alert-danger text-xs">
                    <AlertCircle size={16} />
                    <span>{exceptionError}</span>
                  </div>
                )}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 leading-relaxed">
                  <strong>Strict Workshop Policy:</strong> Work can only proceed to <code>IN_PROGRESS</code> after customer approval of an estimate.
                  If emergency work or direct physical owner instruction requires bypassing estimate creation, the OWNER must record an explicit, audited operational justification.
                </div>

                <div>
                  <label className="input-label text-xs">Documented Operational Justification / Reason:</label>
                  <textarea
                    className="login-input text-xs"
                    rows={3}
                    placeholder="e.g. 'Emergency roadside breakdown intake - customer verbally authorized immediate brake caliper overhaul in workshop'..."
                    value={exceptionReason}
                    onChange={(e) => setExceptionReason(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setShowExceptionModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingException}
                >
                  {isSubmittingException ? 'Recording...' : 'Authorize & Audit Exception'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
