import mongoose from 'mongoose';

export const LEDGER_ENTRY_TYPES = [
  'INVOICE_ISSUED',
  'PAYMENT_RECEIVED',
  'PAYMENT_REVERSED',
  'OPENING_BALANCE',
  'ADJUSTMENT'
];

export const LEDGER_DIRECTIONS = ['DEBIT', 'CREDIT'];

export const LEDGER_SOURCE_TYPES = ['INVOICE', 'PAYMENT', 'ADJUSTMENT', 'MIGRATION'];

const CustomerLedgerEntrySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true
    },
    entryType: {
      type: String,
      enum: LEDGER_ENTRY_TYPES,
      required: [true, 'Entry type is required'],
      index: true
    },
    direction: {
      type: String,
      enum: LEDGER_DIRECTIONS,
      required: [true, 'Direction (DEBIT or CREDIT) is required']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    sourceType: {
      type: String,
      enum: LEDGER_SOURCE_TYPES,
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

CustomerLedgerEntrySchema.index({ customerId: 1, createdAt: 1 });
CustomerLedgerEntrySchema.index({ customerId: 1, entryType: 1 });
CustomerLedgerEntrySchema.index(
  { customerId: 1, sourceType: 1, sourceId: 1, entryType: 1 },
  {
    name: 'idx_customer_ledger_source_ref',
    partialFilterExpression: { sourceId: { $type: 'objectId' } }
  }
);

export const CustomerLedgerEntry = mongoose.model('CustomerLedgerEntry', CustomerLedgerEntrySchema);
export default CustomerLedgerEntry;
