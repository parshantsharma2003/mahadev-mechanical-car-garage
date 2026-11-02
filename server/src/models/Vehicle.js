import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true
    },
    brand: {
      type: String,
      required: [true, 'Vehicle brand is required'],
      trim: true
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true
    },
    // Normalized alphanumeric uppercase string (e.g. "HR11AA1234")
    registrationNumberClean: {
      type: String,
      trim: true,
      uppercase: true,
      default: null
    },
    // Clean formatted string for display (e.g. "HR 11 AA 1234")
    registrationNumberDisplay: {
      type: String,
      trim: true,
      uppercase: true,
      default: null
    },
    fuelType: {
      type: String,
      enum: ['PETROL', 'DIESEL', 'CNG', 'HYBRID', 'EV', 'OTHER'],
      default: 'OTHER'
    },
    color: {
      type: String,
      trim: true
    },
    manufacturingYear: {
      type: Number,
      min: 1980,
      max: 2035
    },
    isProvisional: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      maxlength: 500
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// GLOBALLY UNIQUE PARTIAL INDEX:
// Enforces plate uniqueness across the entire system ONLY when registrationNumberClean is a non-empty string.
VehicleSchema.index(
  { registrationNumberClean: 1 },
  {
    unique: true,
    partialFilterExpression: {
      registrationNumberClean: { $type: 'string', $gt: '' }
    }
  }
);

VehicleSchema.index({ customerId: 1, brand: 1, model: 1 });

export const Vehicle = mongoose.model('Vehicle', VehicleSchema);
export default Vehicle;
