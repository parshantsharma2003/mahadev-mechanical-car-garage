import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, 'Service slug is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true
    },
    shortDesc: {
      type: String,
      trim: true
    },
    fullDesc: {
      type: String,
      trim: true
    },
    priceDisplay: {
      type: String,
      default: 'Contact for Quote',
      trim: true
    },
    basePrice: {
      type: Number,
      default: 0,
      min: 0
    },
    category: {
      type: String,
      default: 'General',
      index: true
    },
    timeEstimate: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      trim: true
    },
    tag: {
      type: String,
      trim: true
    },
    icon: {
      type: String,
      default: 'Wrench',
      trim: true
    },
    highlights: [
      {
        type: String,
        trim: true
      }
    ],
    isPopular: {
      type: Boolean,
      default: false
    },
    isCoreService: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Service = mongoose.model('Service', ServiceSchema);
export default Service;
