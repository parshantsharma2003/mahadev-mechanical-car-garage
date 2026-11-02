import mongoose from 'mongoose';

const EnquirySchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000
    },
    preferredContactMethod: {
      type: String,
      enum: ['PHONE', 'WHATSAPP', 'ANY'],
      default: 'PHONE'
    },
    status: {
      type: String,
      enum: ['NEW', 'PENDING', 'CONTACTED', 'RESOLVED'],
      default: 'PENDING'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolutionNotes: {
      type: String,
      default: ''
    },
    contactedAt: {
      type: Date
    },
    resolvedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

EnquirySchema.index({ status: 1, createdAt: -1 });

export const Enquiry = mongoose.model('Enquiry', EnquirySchema);
export default Enquiry;
