import mongoose from 'mongoose';

const GalleryItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Gallery item title is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true
    },
    image: {
      type: String,
      required: [true, 'Image URL or path is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image'
    },
    videoUrl: {
      type: String,
      trim: true
    },
    badge: {
      type: String,
      trim: true
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    sortOrder: {
      type: Number,
      default: 0
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

export const GalleryItem = mongoose.model('GalleryItem', GalleryItemSchema);
export default GalleryItem;
