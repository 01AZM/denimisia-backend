import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'bulk_create', 'bulk_update', 'import', 'export', 'duplicate', 'toggle_status', 'reorder']
  },
  entityType: {
    type: String,
    required: true,
    default: 'wholesale_tier'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entityType'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userName: String,
  changes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  previousValues: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  newValues: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String,
  description: String
}, {
  timestamps: true
});

// Index for efficient queries
auditLogSchema.index({ entityType: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);