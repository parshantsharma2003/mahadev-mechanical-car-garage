import mongoose from 'mongoose';

export const JOB_CARD_STATUSES = [
  'CREATED',
  'INSPECTION',
  'WAITING_FOR_APPROVAL',
  'IN_PROGRESS',
  'QUALITY_CHECK',
  'COMPLETED',
  'DELIVERED',
  'CANCELLED'
];

export const VALID_JOB_CARD_TRANSITIONS = {
  CREATED: ['INSPECTION', 'CANCELLED'],
  INSPECTION: ['WAITING_FOR_APPROVAL', 'IN_PROGRESS', 'CANCELLED'],
  WAITING_FOR_APPROVAL: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['QUALITY_CHECK', 'CANCELLED'],
  QUALITY_CHECK: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};

const JobCardSchema = new mongoose.Schema(
  {
    jobCardNumber: {
      type: String,
      required: [true, 'Job Card number is required'],
      unique: true,
      trim: true,
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
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
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
    requestedServices: [
      {
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        name: { type: String, required: true, trim: true },
        category: { type: String, default: 'General' },
        price: { type: Number, default: 0 },
        priceDisplay: { type: String, default: '' }
      }
    ],
    customerComplaint: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000
    },
    odometerReading: {
      type: Number,
      default: 0,
      min: [0, 'Odometer reading cannot be negative']
    },
    fuelLevel: {
      type: String,
      enum: ['EMPTY', 'RESERVE', 'QUARTER', 'HALF', 'THREE_QUARTERS', 'FULL'],
      default: 'QUARTER'
    },
    vehicleCondition: {
      exteriorNotes: { type: String, default: '' },
      hasSpareWheel: { type: Boolean, default: true },
      hasJack: { type: Boolean, default: true },
      hasToolKit: { type: Boolean, default: true },
      scratches: { type: [String], default: [] }
    },
    inspectionNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    estimatedDeliveryAt: {
      type: Date,
      default: null
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: JOB_CARD_STATUSES,
      default: 'CREATED',
      index: true
    },
    statusTimeline: [
      {
        status: { type: String, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        notes: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    internalNotes: {
      type: String,
      default: '',
      maxlength: 3000
    },
    currentEstimateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceEstimate',
      default: null
    },
    estimateSummary: {
      estimateNumber: { type: String, default: '' },
      versionNumber: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
      status: { type: String, default: 'NO_ESTIMATE' },
      decision: { type: String, default: null }
    },
    noEstimateException: {
      isAuthorized: { type: Boolean, default: false },
      authorizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reason: { type: String, default: '' },
      authorizedAt: { type: Date, default: null }
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null
    },
    invoiceSummary: {
      invoiceNumber: { type: String, default: '' },
      grandTotal: { type: Number, default: 0 },
      amountPaid: { type: Number, default: 0 },
      balanceDue: { type: Number, default: 0 },
      invoiceStatus: { type: String, default: 'NO_INVOICE' },
      paymentStatus: { type: String, default: 'UNPAID' }
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

// Enforce unique appointmentId when present (sparse partial index)
JobCardSchema.index(
  { appointmentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      appointmentId: { $type: 'objectId' }
    }
  }
);

JobCardSchema.index({ status: 1, receivedAt: -1 });
JobCardSchema.index({ customerId: 1, createdAt: -1 });
JobCardSchema.index({ vehicleId: 1, createdAt: -1 });

export const JobCard = mongoose.model('JobCard', JobCardSchema);
export default JobCard;
