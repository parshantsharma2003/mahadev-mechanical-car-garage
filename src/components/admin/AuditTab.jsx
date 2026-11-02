import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Activity,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  Eye,
  FileCode
} from 'lucide-react';
import { fetchAuditLogs } from '../../utils/api';

export default function AuditTab({ isOwner }) {
  if (!isOwner) {
    return (
      <div className="tab-error-state">
        <AlertCircle size={28} className="text-red-500" />
        <h3 className="font-bold text-lg mt-2">Access Restricted</h3>
        <p>The system audit trail is strictly restricted to the OWNER role.</p>
      </div>
    );
  }

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Log Diff Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchAuditLogs({
        page,
        limit: 20,
        action: actionFilter.trim() || undefined,
        entityType: entityFilter.trim() || undefined,
        actorRole: roleFilter.trim() || undefined
      });
      setLogs(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, entityFilter, roleFilter]);

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  return (
    <div className="tab-pane-container">
      {/* Immutability Alert */}
      <div className="admin-alert-banner alert-warning">
        <Shield size={20} />
        <div className="text-xs">
          <strong>Immutable Security Log:</strong> Audit entries are cryptographically protected and append-only.
          Administrative edit and delete controls are strictly prohibited by system middleware.
        </div>
      </div>

      {/* Toolbar */}
      <div className="filter-toolbar-card">
        <div className="filter-actions-row flex-wrap">
          <div className="select-wrap">
            <Filter size={15} className="select-icon" />
            <select
              className="filter-select"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">All Entities</option>
              <option value="Appointment">Appointments</option>
              <option value="Customer">Customers</option>
              <option value="Vehicle">Vehicles</option>
              <option value="Enquiry">Enquiries</option>
              <option value="Service">Services</option>
              <option value="GalleryItem">Gallery Items</option>
              <option value="Review">Reviews</option>
              <option value="User">Admin Users</option>
              <option value="BusinessSetting">Business Settings</option>
            </select>
          </div>

          <div className="select-wrap">
            <select
              className="filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="OWNER">Owner Actions</option>
              <option value="SUPER_ADMIN">Super Admin Actions</option>
            </select>
          </div>

          <input
            type="text"
            className="filter-search-input"
            style={{ width: '220px' }}
            placeholder="Action (e.g. APPOINTMENT_STATUS_UPDATED)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />

          <button className="btn btn-outline-dark btn-sm" onClick={() => loadLogs(pagination.page)}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Content Table */}
      {isLoading ? (
        <div className="tab-loading-state">
          <div className="loading-spinner" />
          <p>Loading security audit records...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="admin-content-card empty-card">
          <Activity size={36} className="empty-icon" />
          <h4 className="empty-title">No audit records match filters</h4>
          <p className="empty-sub">State-changing operations by administrators will be logged here.</p>
        </div>
      ) : (
        <div className="admin-content-card no-padding">
          <div className="table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity Target</th>
                  <th>Target ID</th>
                  <th>IP Address</th>
                  <th>Changes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div className="text-xs text-slate-600 font-mono">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </div>
                    </td>
                    <td>
                      <div className="cust-cell">
                        <span className="cust-name font-semibold">{log.actorName}</span>
                        <span className={`role-pill-${log.actorRole === 'OWNER' ? 'owner' : 'super'}`}>
                          {log.actorRole}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="audit-action-badge">{log.action}</span>
                    </td>
                    <td>
                      <span className="category-badge">{log.entityType}</span>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-slate-500">
                        {log.entityId ? log.entityId.slice(-8) : '—'}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-slate-400">{log.ipAddress || '127.0.0.1'}</span>
                    </td>
                    <td>
                      {log.diff && (log.diff.before || log.diff.after) ? (
                        <button
                          className="btn-action-icon text-blue-500"
                          onClick={() => setSelectedLog(log)}
                          title="Inspect Before/After Diff"
                        >
                          <FileCode size={16} />
                        </button>
                      ) : (
                        <span className="text-muted text-xs">No Diff</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="table-pagination-bar">
              <span className="pagination-info">
                Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total audit records)
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn-pagination"
                  disabled={pagination.page <= 1}
                  onClick={() => loadLogs(pagination.page - 1)}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  className="btn-pagination"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadLogs(pagination.page + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AUDIT DIFF INSPECTOR MODAL */}
      {selectedLog && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedLog(null)}>
          <div className="admin-modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Audit Record: {selectedLog.action}</h3>
                <span className="text-xs text-slate-500 font-mono">
                  {selectedLog.entityType} (ID: {selectedLog.entityId || 'N/A'})
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedLog(null)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="dossier-row mb-3">
                <span className="dossier-k">Executed By:</span>
                <span className="dossier-v font-semibold">
                  {selectedLog.actorName} ({selectedLog.actorRole}) • {new Date(selectedLog.createdAt).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="diff-grid">
                <div className="diff-column">
                  <h4 className="diff-column-header text-red-600">Before Change:</h4>
                  <pre className="diff-pre">
                    {selectedLog.diff?.before
                      ? JSON.stringify(selectedLog.diff.before, null, 2)
                      : '// No prior state (e.g. Creation event)'}
                  </pre>
                </div>

                <div className="diff-column">
                  <h4 className="diff-column-header text-emerald-600">After Change:</h4>
                  <pre className="diff-pre">
                    {selectedLog.diff?.after
                      ? JSON.stringify(selectedLog.diff.after, null, 2)
                      : '// Record deleted / Terminated'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline-dark" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
