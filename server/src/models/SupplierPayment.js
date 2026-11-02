import mongoose from 'mongoose';

export const SUPPLIER_PAYMENT_METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'];
export const SUPPLIER_PAYMENT_STATUSES = ['COMPLETED', 'REVERSED'];

const SupplierPaymentSchema = new mongoose.Schema(
  {
    paymentReference: {
      type: String,
      required: [true, 'Payment reference is required'],
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
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupplierPurchase',
      default: null,
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Payment amount must be greater than zero']
    },
    paymentMethod: {
      type: String,
      enum: SUPPLIER_PAYMENT_METHODS,
      required: [true, 'Payment method is required'],
      default: 'CASH'
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    transactionReference: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User recording payment is required']
    },
    status: {
      type: String,
      enum: SUPPLIER_PAYMENT_STATUSES,
      default: 'COMPLETED',
      index: true
    },
    reversedAt: {
      type: Date,
      default: null
    },
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reversalReason: {
      type: String,
      trim: true,
      default: ''
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

SupplierPaymentSchema.index({ supplierId: 1, paymentDate: -1 });
SupplierPaymentSchema.index({ purchaseId: 1, status: 1 });

export const SupplierPayment = mongoose.model('SupplierPayment', SupplierPaymentSchema);
export default SupplierPayment;
