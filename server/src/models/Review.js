import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    carModel: {
      type: String,
      trim: true
    },
    serviceTaken: {
      type: String,
      trim: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 5
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true
    },
    reviewDate: {
      type: String,
      trim: true
    },
    verified: {
      type: Boolean,
      default: true
    },
    source: {
      type: String,
      default: 'Google Verified',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Review = mongoose.model('Review', ReviewSchema);
export default Review;
