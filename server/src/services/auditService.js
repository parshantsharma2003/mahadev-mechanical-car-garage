import { AuditLog } from '../models/AuditLog.js';

/**
 * Dedicated service for creating application-level immutable audit records.
 * Ensures consistent metadata validation and actor attribution.
 *
 * @param {Object} params
 * @param {string|import('mongoose').Types.ObjectId} params.actorId - ID of admin user executing action
 * @param {'OWNER'|'SUPER_ADMIN'} params.actorRole - Role of the admin user
 * @param {string} params.actorName - Name of the admin user
 * @param {string} params.action - Categorized action identifier (e.g. USER_CREATED, SERVICE_DEACTIVATED)
 * @param {string} params.entityType - Resource type (e.g. Appointment, Customer, User)
 * @param {string|null} [params.entityId] - Target resource ID
 * @param {Object|null} [params.diff] - Snapshot of changes { before, after }
 * @param {string} [params.ipAddress] - Request IP address
 * @param {string} [params.userAgent] - Request User-Agent header
 * @returns {Promise<import('../models/AuditLog.js').AuditLog>}
 */
export async function createAuditRecord({
  actorId,
  actorRole,
  actorName,
  action,
  entityType,
  entityId = null,
  diff = null,
  ipAddress = '127.0.0.1',
  userAgent = 'internal/system'
}) {
  if (!actorId) throw new Error('Audit record creation requires actorId.');
  if (!actorRole || !['OWNER', 'SUPER_ADMIN'].includes(actorRole)) {
    throw new Error('Audit record creation requires valid actorRole (OWNER or SUPER_ADMIN).');
  }
  if (!action) throw new Error('Audit record creation requires an action string.');
  if (!entityType) throw new Error('Audit record creation requires an entityType string.');

  const entry = new AuditLog({
    actorId,
    actorRole,
    actorName: actorName || 'Admin User',
    action: action.trim().toUpperCase(),
    entityType: entityType.trim(),
    entityId: entityId ? String(entityId) : null,
    diff: diff
      ? {
          before: diff.before || null,
          after: diff.after || null
        }
      : { before: null, after: null },
    ipAddress,
    userAgent
  });

  return entry.save();
}
