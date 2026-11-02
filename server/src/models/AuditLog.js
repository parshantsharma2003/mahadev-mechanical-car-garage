import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    actorRole: {
      type: String,
      enum: ['OWNER', 'SUPER_ADMIN'],
      required: true
    },
    actorName: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      required: true,
      index: true
    },
    entityId: {
      type: String,
      index: true
    },
    diff: {
      before: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      },
      after: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      }
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    }
  },
  {
    // Append-only: createdAt enabled, updatedAt disabled
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

// -----------------------------------------------------------------------------
// APPLICATION-LEVEL IMMUTABILITY GUARDS
//
// NOTE: These Mongoose middleware hooks and static method overrides enforce
// application-level immutability across all Mongoose query and document execution
// paths in the backend application layer.
// True database-level immutability against direct root DB administrator actions
// requires MongoDB Atlas user privilege restrictions (e.g., granting readWrite role
// without delete/dropCollection permissions on the audit collection).
// -----------------------------------------------------------------------------

const blockMutation = function () {
  throw new Error('AUDIT_LOG_IMMUTABLE: Audit logs are append-only and cannot be updated or deleted.');
};

// 1. Query-level update and replace blockers
AuditLogSchema.pre('updateOne', blockMutation);
AuditLogSchema.pre('updateMany', blockMutation);
AuditLogSchema.pre('findOneAndUpdate', blockMutation);
AuditLogSchema.pre('replaceOne', blockMutation);
AuditLogSchema.pre('findOneAndReplace', blockMutation);

// 2. Query-level delete blockers
AuditLogSchema.pre('deleteOne', blockMutation);
AuditLogSchema.pre('deleteMany', blockMutation);
AuditLogSchema.pre('findOneAndDelete', blockMutation);

// 3. Document-level save blocker (prevents doc.save() on existing documents)
AuditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    throw new Error('AUDIT_LOG_IMMUTABLE: Existing audit log records cannot be modified.');
  }
  next();
});

// 4. Document-level delete blocker (prevents doc.deleteOne())
AuditLogSchema.pre('deleteOne', { document: true, query: false }, blockMutation);

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// 5. Model-level bulk write blocker
AuditLog.bulkWrite = function () {
  return Promise.reject(
    new Error('AUDIT_LOG_IMMUTABLE: Bulk write mutations on AuditLog are prohibited.')
  );
};

export default AuditLog;
