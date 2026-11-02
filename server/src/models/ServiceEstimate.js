import mongoose from 'mongoose';

export const ESTIMATE_STATUSES = [
  'DRAFT',
  'SENT',
  'APPROVED',
  'PARTIALLY_APPROVED',
  'REJECTED',
  'SUPERSEDED',
  'EXPIRED'
];

export const ITEM_TYPES = ['LABOUR', 'SERVICE', 'PART', 'OTHER'];

export const APPROVAL_SOURCES = ['IN_PERSON', 'PHONE', 'WHATSAPP', 'OTHER'];

const EstimateItemSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      default: null
    },
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
    itemType: {
      type: String,
      enum: ITEM_TYPES,
      default: 'SERVICE'
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    }
  },
  { _id: true }
);

const CustomerDecisionSchema = new mongoose.Schema(
  {
    decision: {
      type: String,
      enum: ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', null],
      default: null
    },
    decisionTimestamp: {
      type: Date,
      default: null
    },
    approvalSource: {
      type: String,
      enum: [...APPROVAL_SOURCES, null],
      default: null
    },
    customerName: {
      type: String,
      default: '',
      trim: true
    },
    customerMobile: {
      type: String,
      default: '',
      trim: true
    },
    customerComment: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedItemIndices: {
      type: [Number],
      default: []
    },
    rejectedItemIndices: {
      type: [Number],
      default: []
    }
  },
  { _id: false }
);

const ServiceEstimateSchema = new mongoose.Schema(
  {
    estimateNumber: {
      type: String,
      required: [true, 'Estimate number is required'],
      trim: true,
      uppercase: true,
      index: true
    },
    jobCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobCard',
      required: [true, 'Job Card ID is required'],
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
    versionNumber: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    isCurrent: {
      type: Boolean,
      default: true,
      index: true
    },
    items: {
      type: [EstimateItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Estimate must contain at least one line item.'
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
    customerMessage: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1500
    },
    internalNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 3000
    },
    status: {
      type: String,
      enum: ESTIMATE_STATUSES,
      default: 'DRAFT',
      index: true
    },
    customerDecision: {
      type: CustomerDecisionSchema,
      default: () => ({})
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sentAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound unique index: version uniqueness per Job Card
ServiceEstimateSchema.index(
  { jobCardId: 1, versionNumber: 1 },
  { unique: true }
);

// Compound unique index: estimateNumber + versionNumber
ServiceEstimateSchema.index(
  { estimateNumber: 1, versionNumber: 1 },
  { unique: true }
);

ServiceEstimateSchema.index({ jobCardId: 1, isCurrent: 1 });
ServiceEstimateSchema.index({ customerId: 1, createdAt: -1 });
ServiceEstimateSchema.index({ status: 1, createdAt: -1 });

export const ServiceEstimate = mongoose.model('ServiceEstimate', ServiceEstimateSchema);
export default ServiceEstimate;
