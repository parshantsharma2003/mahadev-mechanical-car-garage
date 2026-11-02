import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit3,
  KeyRound,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  UserCheck
} from 'lucide-react';
import {
  fetchSuperAdmins,
  createSuperAdmin,
  updateSuperAdmin,
  toggleSuperAdminStatus,
  resetSuperAdminPassword
} from '../../utils/api';

export default function UsersTab({ isOwner }) {
  if (!isOwner) {
    return (
      <div className="tab-error-state">
        <AlertCircle size={28} className="text-red-500" />
        <h3 className="font-bold text-lg mt-2">Access Restricted</h3>
        <p>This administrative user management console is strictly restricted to the OWNER role.</p>
      </div>
    );
  }

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit Modal
  const [editingUser, setEditingUser] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // Reset Password Modal
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchSuperAdmins();
      setUsers(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load administrator accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      await toggleSuperAdminStatus(user._id);
      loadUsers();
    } catch (err) {
      alert('Failed to toggle status: ' + err.message);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!createForm.fullName.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setCreateError('Full name, email, and master password are required.');
      return;
    }

    setIsCreating(true);
    try {
      await createSuperAdmin({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        phone: createForm.phone.trim() || undefined
      });
      setIsCreateOpen(false);
      setCreateForm({ fullName: '', email: '', password: '', phone: '' });
      loadUsers();
    } catch (err) {
      setCreateError(err.message || 'Failed to create SUPER_ADMIN account.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdating(true);
    setUpdateError('');
    try {
      await updateSuperAdmin(editingUser._id, {
        fullName: editingUser.fullName.trim(),
        phone: editingUser.phone?.trim() || undefined
      });
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      setUpdateError(err.message || 'Failed to update account.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetTargetUser || !newPassword.trim()) {
      setResetError('New password is required.');
      return;
    }

    setIsResetting(true);
    setResetError('');
    setResetSuccess('');
    try {
      await resetSuperAdminPassword(resetTargetUser._id, newPassword);
      setResetSuccess('Password reset successfully! Previous sessions invalidated.');
      setTimeout(() => {
        setResetTargetUser(null);
        setNewPassword('');
      }, 1200);
    } catch (err) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="tab-pane-container">
      {/* OWNER Privilege Banner */}
      <div className="admin-alert-banner alert-warning">
        <Shield size={20} />
        <div className="text-xs">
          <strong>Owner Authorization Active:</strong> You have exclusive permission to provision,
          activate, deactivate, and manage passwords for operational SUPER_ADMIN accounts.
          All actions are written to the permanent audit trail.
        </div>
      </div>

      {/* Toolbar */}
      <div className="filter-toolbar-card">
        <div>
          <h3 className="section-card-title">SUPER_ADMIN Account Registry</h3>
          <p className="section-card-sub">Workshop staff with operational dashboard permissions</p>
        </div>

        <div className="filter-actions-row">
          <button className="btn btn-outline-dark btn-sm" onClick={loadUsers}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} />
            <span>Create SUPER_ADMIN</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="tab-loading-state">
          <div className="loading-spinner" />
          <p>Loading administrative users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="admin-content-card empty-card">
          <UserCheck size={36} className="empty-icon" />
          <h4 className="empty-title">No SUPER_ADMIN accounts found</h4>
          <p className="empty-sub">
            Click "Create SUPER_ADMIN" to grant operational access to garage floor staff.
          </p>
        </div>
      ) : (
        <div className="admin-content-card no-padding">
          <div className="table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Login Email</th>
                  <th>Phone</th>
                  <th>Assigned Role</th>
                  <th>Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className={!u.isActive ? 'tr-muted' : ''}>
                    <td>
                      <div className="cust-cell">
                        <span className="cust-name font-semibold">{u.fullName}</span>
                        <span className="text-xs text-slate-500 font-mono">ID: {u._id}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-sm">{u.email}</span>
                    </td>
                    <td>
                      <span className="font-mono text-xs">{u.phone || '—'}</span>
                    </td>
                    <td>
                      <span className="role-pill-super">SUPER_ADMIN</span>
                    </td>
                    <td>
                      <button
                        className={`btn-toggle-switch ${u.isActive ? 'active' : ''}`}
                        onClick={() => handleToggleStatus(u)}
                        title={u.isActive ? 'Click to deactivate account' : 'Click to activate account'}
                      >
                        {u.isActive ? (
                          <>
                            <ToggleRight size={22} className="text-emerald-500" />
                            <span className="text-emerald-600 font-semibold text-xs">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={22} className="text-slate-400" />
                            <span className="text-slate-400 text-xs">Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons-wrap">
                        <button
                          className="btn-action-icon"
                          onClick={() => setEditingUser(u)}
                          title="Edit Profile"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="btn-action-icon text-amber-500"
                          onClick={() => {
                            setResetTargetUser(u);
                            setNewPassword('');
                            setResetError('');
                            setResetSuccess('');
                          }}
                          title="Reset Password"
                        >
                          <KeyRound size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE SUPER_ADMIN MODAL */}
      {isCreateOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Provision New SUPER_ADMIN Account</h3>
              <button className="modal-close-btn" onClick={() => setIsCreateOpen(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="modal-body">
              {createError && (
                <div className="admin-alert-banner alert-danger">
                  <AlertCircle size={16} />
                  <span>{createError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="input-label">
                  <span>Full Staff Name:</span>
                </label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="e.g. Ramesh Kumar"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Staff Login Email:</span>
                </label>
                <input
                  type="email"
                  className="login-input"
                  placeholder="e.g. ramesh@mahadevgarage.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label className="input-label">
                    <span>Initial Master Password:</span>
                  </label>
                  <input
                    type="password"
                    className="login-input"
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">
                    <span>Phone Number:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="10-digit mobile"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreating}
                >
                  <Plus size={16} />
                  <span>{isCreating ? 'Provisioning...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="admin-modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit SUPER_ADMIN: {editingUser.fullName}</h3>
              <button className="modal-close-btn" onClick={() => setEditingUser(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="modal-body">
              {updateError && (
                <div className="admin-alert-banner alert-danger">
                  <AlertCircle size={16} />
                  <span>{updateError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="input-label">
                  <span>Full Name:</span>
                </label>
                <input
                  type="text"
                  className="login-input"
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Phone Number:</span>
                </label>
                <input
                  type="text"
                  className="login-input"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setEditingUser(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating}
                >
                  <Save size={16} />
                  <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetTargetUser && (
        <div className="admin-modal-backdrop" onClick={() => setResetTargetUser(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reset Password: {resetTargetUser.fullName}</h3>
              <button className="modal-close-btn" onClick={() => setResetTargetUser(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="modal-body">
              <p className="modal-explainer">
                Set a new password for <strong>{resetTargetUser.email}</strong>.
                This will immediately invalidate all active sessions for this account.
              </p>

              {resetError && (
                <div className="admin-alert-banner alert-danger">
                  <AlertCircle size={16} />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="admin-alert-banner alert-success">
                  <CheckCircle2 size={16} />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <div className="form-group">
                <label className="input-label">
                  <span>New Password:</span>
                </label>
                <input
                  type="password"
                  className="login-input"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setResetTargetUser(null)}
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isResetting}
                >
                  <KeyRound size={16} />
                  <span>{isResetting ? 'Resetting...' : 'Confirm Reset Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
