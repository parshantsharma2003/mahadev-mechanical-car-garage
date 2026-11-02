import mongoose from 'mongoose';

export const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'];
export const PAYMENT_RECORD_STATUSES = ['COMPLETED', 'REVERSED'];

const PaymentSchema = new mongoose.Schema(
  {
    paymentReference: {
      type: String,
      required: [true, 'Payment reference is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice ID is required'],
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than zero']
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: [true, 'Payment method is required']
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    transactionReference: {
      type: String,
      trim: true,
      default: '',
      maxlength: 100
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1000
    },
    status: {
      type: String,
      enum: PAYMENT_RECORD_STATUSES,
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
      default: '',
      maxlength: 1000
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

PaymentSchema.index({ customerId: 1, paymentDate: -1 });
PaymentSchema.index({ invoiceId: 1, status: 1 });
PaymentSchema.index({ status: 1, paymentDate: -1 });

export const Payment = mongoose.model('Payment', PaymentSchema);
export default Payment;
