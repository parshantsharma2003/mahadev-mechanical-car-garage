import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 80
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address format']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never exposed in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['OWNER', 'SUPER_ADMIN'],
        message: 'Role must be either OWNER or SUPER_ADMIN'
      },
      required: true,
      index: true
    },
    phone: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    lastLoginAt: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
UserSchema.index({ email: 1, isActive: 1 });

/**
 * Compare plain text password against stored bcrypt hash.
 * @param {string} candidatePassword
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
UserSchema.methods.comparePassword = async function (candidatePassword, hash) {
  const targetHash = hash || this.passwordHash;
  if (!targetHash) {
    throw new Error('Password hash not provided for comparison');
  }
  return bcrypt.compare(candidatePassword, targetHash);
};

export const User = mongoose.model('User', UserSchema);
export default User;
