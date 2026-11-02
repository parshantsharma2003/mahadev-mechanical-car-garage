import mongoose from 'mongoose';

export const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'CANCELLED'];
export const PAYMENT_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED'];
export const INVOICE_ITEM_TYPES = ['SERVICE', 'LABOUR', 'PART', 'OTHER'];

const InvoiceItemSchema = new mongoose.Schema(
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
    itemType: {
      type: String,
      enum: INVOICE_ITEM_TYPES,
      default: 'SERVICE'
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be greater than zero']
    },
    unit: {
      type: String,
      trim: true,
      default: 'job'
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0
    },
    sourceEstimateItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  { _id: true }
);

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
      index: true
    },
    jobCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobCard',
      required: [true, 'Job Card ID is required'],
      index: true
    },
    estimateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceEstimate',
      default: null
    },
    customerSnapshot: {
      fullName: { type: String, required: true, trim: true },
      mobileNumber: { type: String, required: true, trim: true },
      email: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: 'Gohana' },
      address: { type: String, trim: true, default: '' }
    },
    vehicleSnapshot: {
      brand: { type: String, required: true, trim: true },
      model: { type: String, required: true, trim: true },
      registrationNumber: { type: String, trim: true, default: '' },
      fuelType: { type: String, trim: true, default: 'OTHER' },
      manufacturingYear: { type: Number, default: null },
      color: { type: String, trim: true, default: '' }
    },
    jobCardSnapshot: {
      jobCardNumber: { type: String, required: true, trim: true },
      odometerReading: { type: Number, default: 0 },
      fuelLevel: { type: String, default: 'QUARTER' },
      receivedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null }
    },
    items: {
      type: [InvoiceItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Invoice must contain at least one line item.'
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
      min: [0, 'Discount amount cannot be negative']
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
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
      enum: PAYMENT_STATUSES,
      default: 'UNPAID',
      index: true
    },
    invoiceStatus: {
      type: String,
      enum: INVOICE_STATUSES,
      default: 'DRAFT',
      index: true
    },
    issueDate: {
      type: Date,
      default: null,
      index: true
    },
    issuedAt: {
      type: Date,
      default: null
    },
    dueDate: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancellationReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000
    },
    termsAndConditions: {
      type: String,
      default: 'All replaced parts have been inspected. Payment is due upon delivery.',
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for query performance and preventing duplicates
InvoiceSchema.index({ customerId: 1, createdAt: -1 });
InvoiceSchema.index({ vehicleId: 1, createdAt: -1 });
InvoiceSchema.index({ invoiceStatus: 1, paymentStatus: 1 });
InvoiceSchema.index({ issueDate: -1 });

// Prevent duplicate active (DRAFT or ISSUED) invoices for the same Job Card
InvoiceSchema.index(
  { jobCardId: 1, invoiceStatus: 1 },
  {
    name: 'unique_active_invoice_per_job_card',
    partialFilterExpression: {
      invoiceStatus: { $in: ['DRAFT', 'ISSUED'] }
    }
  }
);

export const Invoice = mongoose.model('Invoice', InvoiceSchema);
export default Invoice;
