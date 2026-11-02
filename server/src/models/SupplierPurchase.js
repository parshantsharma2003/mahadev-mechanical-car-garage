import mongoose from 'mongoose';

export const PURCHASE_PAYMENT_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID'];
export const PURCHASE_STATUSES = ['DRAFT', 'RECORDED', 'CANCELLED'];

const PurchaseItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be greater than zero']
    },
    unit: {
      type: String,
      trim: true,
      default: 'pcs'
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    },
    lineTotal: {
      type: Number,
      required: [true, 'Line total is required'],
      min: [0, 'Line total cannot be negative']
    },
    category: {
      type: String,
      trim: true,
      default: 'GENERAL'
    }
  },
  { _id: true }
);

const SupplierPurchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      required: [true, 'Purchase number is required'],
      unique: true,
      trim: true,
      index: true
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier ID is required'],
      index: true
    },
    supplierSnapshot: {
      businessName: { type: String, required: true },
      contactPerson: { type: String, default: '' },
      mobileNumber: { type: String, default: '' },
      supplierCode: { type: String, default: '' }
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    supplierInvoiceNumber: {
      type: String,
      trim: true,
      default: ''
    },
    items: {
      type: [PurchaseItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'A purchase must have at least one line item.'
      }
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tax amount cannot be negative']
    },
    grandTotal: {
      type: Number,
      required: true,
      min: [0, 'Grand total cannot be negative']
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, 'Amount paid cannot be negative']
    },
    balanceDue: {
      type: Number,
      required: true,
      min: [0, 'Balance due cannot be negative']
    },
    paymentStatus: {
      type: String,
      enum: PURCHASE_PAYMENT_STATUSES,
      default: 'UNPAID',
      index: true
    },
    purchaseStatus: {
      type: String,
      enum: PURCHASE_STATUSES,
      default: 'RECORDED',
      index: true
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

SupplierPurchaseSchema.index({ supplierId: 1, purchaseDate: -1 });
SupplierPurchaseSchema.index({ supplierId: 1, paymentStatus: 1 });
SupplierPurchaseSchema.index({ supplierInvoiceNumber: 1, supplierId: 1 });

export const SupplierPurchase = mongoose.model('SupplierPurchase', SupplierPurchaseSchema);
export default SupplierPurchase;
