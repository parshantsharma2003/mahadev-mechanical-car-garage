import mongoose from 'mongoose';

export const EXPENSE_CATEGORIES = [
  'ELECTRICITY',
  'WATER',
  'RENT',
  'STAFF_SALARY',
  'TEA_FOOD',
  'CLEANING',
  'TOOLS_EQUIPMENT',
  'MACHINE_MAINTENANCE',
  'FUEL_TRANSPORT',
  'INTERNET_PHONE',
  'MARKETING',
  'OFFICE_SUPPLIES',
  'REPAIR_MAINTENANCE',
  'OTHER'
];

export const EXPENSE_PAYMENT_METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'];

export const EXPENSE_STATUSES = ['RECORDED', 'REVERSED'];

const ExpenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      required: [true, 'Expense number is required'],
      unique: true,
      trim: true,
      index: true
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      enum: {
        values: EXPENSE_CATEGORIES,
        message: 'Invalid expense category'
      },
      index: true
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ''
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Expense amount must be greater than zero']
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: EXPENSE_PAYMENT_METHODS,
        message: 'Invalid payment method'
      },
      default: 'CASH'
    },
    expenseDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    vendorName: {
      type: String,
      trim: true,
      default: ''
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
      index: true
    },
    receiptReference: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: EXPENSE_STATUSES,
      default: 'RECORDED',
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

ExpenseSchema.index({ expenseDate: -1, status: 1 });
ExpenseSchema.index({ category: 1, expenseDate: -1 });

export const Expense = mongoose.model('Expense', ExpenseSchema);
export default Expense;
