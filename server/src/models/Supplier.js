import mongoose from 'mongoose';

export const SUPPLIER_CATEGORIES = [
  'SPARE_PARTS',
  'ENGINE_OIL',
  'LUBRICANTS',
  'TYRES',
  'BATTERY',
  'CAR_ACCESSORIES',
  'CLEANING_MATERIAL',
  'TOOLS_EQUIPMENT',
  'MACHINE_PARTS',
  'GENERAL',
  'OTHER'
];

export const OPENING_BALANCE_DIRECTIONS = ['OPENING_PAYABLE', 'OPENING_CREDIT'];

const SupplierSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: String,
      required: [true, 'Supplier code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: 200,
      index: true
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true,
      maxlength: 100
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true
    },
    alternateMobileNumber: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: 'Pune'
    },
    state: {
      type: String,
      trim: true,
      default: 'Maharashtra'
    },
    supplierCategory: {
      type: String,
      enum: {
        values: SUPPLIER_CATEGORIES,
        message: 'Invalid supplier category'
      },
      default: 'SPARE_PARTS',
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: [0, 'Opening balance cannot be negative']
    },
    openingBalanceDirection: {
      type: String,
      enum: OPENING_BALANCE_DIRECTIONS,
      default: 'OPENING_PAYABLE'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required']
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

SupplierSchema.index({ businessName: 1, isActive: 1 });
SupplierSchema.index({ mobileNumber: 1, isActive: 1 });

export const Supplier = mongoose.model('Supplier', SupplierSchema);
export default Supplier;
