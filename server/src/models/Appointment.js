import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true
    },
    requestFingerprint: {
      type: String,
      default: ''
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      index: true
    },
    customerSnapshot: {
      fullName: { type: String, required: true },
      mobileNumber: { type: String, required: true }
    },
    vehicleSnapshot: {
      brand: { type: String, required: true },
      model: { type: String, required: true },
      registrationNumber: { type: String, default: '' }
    },
    services: [
      {
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        title: { type: String, required: true },
        priceDisplay: { type: String }
      }
    ],
    preferredDate: {
      type: Date,
      required: true
    },
    preferredTimeSlot: {
      type: String,
      required: true,
      enum: [
        'Morning (09:00 AM - 12:00 PM)',
        'Afternoon (12:00 PM - 03:00 PM)',
        'Evening (03:00 PM - 07:00 PM)'
      ]
    },
    problemDescription: {
      type: String,
      default: '',
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'],
      default: 'PENDING'
    },
    statusTimeline: [
      {
        status: { type: String, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        reason: { type: String },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    source: {
      type: String,
      enum: ['WEBSITE_ONLINE', 'WHATSAPP', 'PHONE_CALL', 'WALK_IN'],
      default: 'WEBSITE_ONLINE'
    },
    adminNotes: {
      type: String,
      default: ''
    },
    registrationConflict: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

AppointmentSchema.index({ status: 1, preferredDate: -1 });

export const Appointment = mongoose.model('Appointment', AppointmentSchema);
export default Appointment;
