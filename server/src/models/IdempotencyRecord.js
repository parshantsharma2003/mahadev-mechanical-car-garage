import mongoose from 'mongoose';

const IdempotencyRecordSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true
    },
    endpoint: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'COMPLETED'
    },
    statusCode: {
      type: Number
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed
    },
    requestFingerprint: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now,
      // 48 hours = 48 * 60 * 60 = 172800 seconds
      expires: 172800
    }
  },
  {
    versionKey: false
  }
);

export const IdempotencyRecord = mongoose.model('IdempotencyRecord', IdempotencyRecordSchema);
export default IdempotencyRecord;
