import mongoose from 'mongoose';

export const SUPPLIER_LEDGER_ENTRY_TYPES = [
  'OPENING_BALANCE',
  'PURCHASE',
  'PAYMENT',
  'PAYMENT_REVERSAL',
  'PURCHASE_REVERSAL',
  'ADJUSTMENT'
];

export const SUPPLIER_LEDGER_DIRECTIONS = ['DEBIT', 'CREDIT'];

export const SUPPLIER_LEDGER_SOURCE_TYPES = [
  'PURCHASE',
  'PAYMENT',
  'OPENING_BALANCE',
  'ADJUSTMENT',
  'MIGRATION'
];

const SupplierLedgerEntrySchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier ID is required'],
      index: true
    },
    entryType: {
      type: String,
      enum: SUPPLIER_LEDGER_ENTRY_TYPES,
      required: [true, 'Entry type is required'],
      index: true
    },
    direction: {
      type: String,
      enum: SUPPLIER_LEDGER_DIRECTIONS,
      required: [true, 'Direction (DEBIT or CREDIT) is required']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    sourceType: {
      type: String,
      enum: SUPPLIER_LEDGER_SOURCE_TYPES,
      required: [true, 'Source type is required']
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    referenceNumber: {
      type: String,
      required: [true, 'Reference number is required'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 1000
    },
    balanceAfter: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

SupplierLedgerEntrySchema.index({ supplierId: 1, createdAt: 1 });
SupplierLedgerEntrySchema.index({ supplierId: 1, entryType: 1 });
SupplierLedgerEntrySchema.index(
  { supplierId: 1, sourceType: 1, sourceId: 1, entryType: 1 },
  {
    name: 'idx_supplier_ledger_source_ref',
    partialFilterExpression: { sourceId: { $type: 'objectId' } }
  }
);

export const SupplierLedgerEntry = mongoose.model('SupplierLedgerEntry', SupplierLedgerEntrySchema);
export default SupplierLedgerEntry;
