import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: 100
    },
    // Normalized 10-digit Indian cellular number
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      index: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number']
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true
    },
    city: {
      type: String,
      default: 'Gohana',
      trim: true
    },
    address: {
      type: String,
      trim: true,
      maxlength: 250
    },
    internalNotes: {
      type: String,
      default: '',
      maxlength: 1000
    },
    totalBookingsCount: {
      type: Number,
      default: 1,
      min: 0
    },
    lastVisitDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Customer = mongoose.model('Customer', CustomerSchema);
export default Customer;
