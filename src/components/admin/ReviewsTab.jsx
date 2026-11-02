import React, { useState, useEffect } from 'react';
import {
  Star,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  fetchAdminReviews,
  createAdminReview,
  updateAdminReview,
  toggleAdminReview,
  deleteAdminReview
} from '../../utils/api';

export default function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [modalReview, setModalReview] = useState(null); // { isNew, ...fields }
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadReviews = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAdminReviews();
      setReviews(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load reviews.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleToggle = async (id, field) => {
    try {
      await toggleAdminReview(id, field);
      loadReviews();
    } catch (err) {
      alert(`Failed to toggle ${field}: ` + err.message);
    }
  };

  const handleOpenAdd = () => {
    setModalError('');
    setModalSuccess('');
    setModalReview({
      isNew: true,
      customerName: '',
      carModel: '',
      serviceTaken: 'Periodic Service',
      rating: 5,
      comment: '',
      reviewDate: 'Recently',
      verified: true,
      source: 'Google Verified',
      isActive: true
    });
  };

  const handleOpenEdit = (r) => {
    setModalError('');
    setModalSuccess('');
    setModalReview({
      isNew: false,
      id: r._id,
      customerName: r.customerName || '',
      carModel: r.carModel || '',
      serviceTaken: r.serviceTaken || '',
      rating: r.rating || 5,
      comment: r.comment || '',
      reviewDate: r.reviewDate || 'Recently',
      verified: r.verified !== undefined ? Boolean(r.verified) : true,
      source: r.source || 'Google Verified',
      isActive: r.isActive !== undefined ? Boolean(r.isActive) : true
    });
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!modalReview) return;

    if (!modalReview.customerName.trim() || !modalReview.comment.trim()) {
      setModalError('Customer name and review comment are required.');
      return;
    }

    setIsSaving(true);
    setModalError('');
    setModalSuccess('');

    const payload = {
      customerName: modalReview.customerName.trim(),
      carModel: modalReview.carModel.trim(),
      serviceTaken: modalReview.serviceTaken.trim(),
      rating: Number(modalReview.rating) || 5,
      comment: modalReview.comment.trim(),
      reviewDate: modalReview.reviewDate.trim(),
      verified: modalReview.verified,
      source: modalReview.source.trim(),
      isActive: modalReview.isActive
    };

    try {
      if (modalReview.isNew) {
        await createAdminReview(payload);
        setModalSuccess('Customer review added successfully!');
      } else {
        await updateAdminReview(modalReview.id, payload);
        setModalSuccess('Review updated successfully!');
      }

      setTimeout(() => {
        setModalReview(null);
        loadReviews();
      }, 1000);
    } catch (err) {
      setModalError(err.message || 'Failed to save review.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAdminReview(deleteTarget._id);
      setDeleteTarget(null);
      loadReviews();
    } catch (err) {
      alert('Failed to delete review: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.carModel || '').toLowerCase().includes(q) ||
      (r.comment || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="tab-pane-container">
      {/* Toolbar */}
      <div className="filter-toolbar-card">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search reviews by customer name, car model, or comment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-actions-row">
          <button className="btn btn-outline-dark btn-sm" onClick={loadReviews}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Add Genuine Review</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Review List */}
      {isLoading ? (
        <div className="tab-loading-state">
          <div className="loading-spinner" />
          <p>Loading customer reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="admin-content-card empty-card">
          <Star size={36} className="empty-icon" />
          <h4 className="empty-title">No reviews found</h4>
          <p className="empty-sub">
            {searchQuery ? 'Try clearing your search query.' : 'Click "Add Genuine Review" to record customer feedback.'}
          </p>
        </div>
      ) : (
        <div className="admin-content-card no-padding">
          <div className="table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Customer & Car</th>
                  <th>Rating</th>
                  <th>Service Taken</th>
                  <th>Comment</th>
                  <th>Verified</th>
                  <th>Public Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((r) => (
                  <tr key={r._id} className={!r.isActive ? 'tr-muted' : ''}>
                    <td>
                      <div className="cust-cell">
                        <span className="cust-name font-semibold">{r.customerName}</span>
                        <span className="text-xs text-slate-500">
                          {r.carModel ? `${r.carModel} • ` : ''}
                          {r.reviewDate || 'Recently'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: r.rating || 5 }).map((_, i) => (
                          <Star key={i} size={14} fill="currentColor" />
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="category-badge">{r.serviceTaken || 'General Service'}</span>
                    </td>
                    <td>
                      <p className="enquiry-table-msg">{r.comment}</p>
                    </td>
                    <td>
                      <button
                        className={`badge-verified-btn ${r.verified ? 'is-verified' : ''}`}
                        onClick={() => handleToggle(r._id, 'verified')}
                        title="Click to toggle verified status"
                      >
                        <ShieldCheck size={14} />
                        <span>{r.verified ? 'Verified' : 'Unverified'}</span>
                      </button>
                    </td>
                    <td>
                      <button
                        className={`btn-toggle-switch ${r.isActive ? 'active' : ''}`}
                        onClick={() => handleToggle(r._id, 'isActive')}
                        title={r.isActive ? 'Click to hide from public site' : 'Click to show on public site'}
                      >
                        {r.isActive ? (
                          <>
                            <ToggleRight size={22} className="text-emerald-500" />
                            <span className="text-emerald-600 font-semibold text-xs">Public</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={22} className="text-slate-400" />
                            <span className="text-slate-400 text-xs">Hidden</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons-wrap">
                        <button
                          className="btn-action-icon"
                          onClick={() => handleOpenEdit(r)}
                          title="Edit Review"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="btn-action-icon text-red-500"
                          onClick={() => setDeleteTarget(r)}
                          title="Delete Review"
                        >
                          <Trash2 size={16} />
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

      {/* ADD / EDIT REVIEW MODAL */}
      {modalReview && (
        <div className="admin-modal-backdrop" onClick={() => setModalReview(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalReview.isNew ? 'Add Genuine Customer Review' : `Edit Review: ${modalReview.customerName}`}
              </h3>
              <button className="modal-close-btn" onClick={() => setModalReview(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="modal-body">
              {modalError && (
                <div className="admin-alert-banner alert-danger">
                  <AlertCircle size={16} />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="admin-alert-banner alert-success">
                  <CheckCircle2 size={16} />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <div className="form-row-two">
                <div className="form-group">
                  <label className="input-label">
                    <span>Customer Name:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. Amit Malik"
                    value={modalReview.customerName}
                    onChange={(e) => setModalReview({ ...modalReview, customerName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">
                    <span>Car Model:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. Mahindra Scorpio-N"
                    value={modalReview.carModel}
                    onChange={(e) => setModalReview({ ...modalReview, carModel: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label className="input-label">
                    <span>Service Taken:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. Engine Carbon Cleaning"
                    value={modalReview.serviceTaken}
                    onChange={(e) => setModalReview({ ...modalReview, serviceTaken: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">
                    <span>Rating (1 to 5 Stars):</span>
                  </label>
                  <select
                    className="filter-select w-full"
                    value={modalReview.rating}
                    onChange={(e) => setModalReview({ ...modalReview, rating: Number(e.target.value) })}
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                    <option value={3}>⭐⭐⭐ (3 Stars)</option>
                    <option value={2}>⭐⭐ (2 Stars)</option>
                    <option value={1}>⭐ (1 Star)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Customer Review Text:</span>
                </label>
                <textarea
                  className="login-input"
                  rows={3}
                  placeholder="Paste or write customer feedback..."
                  value={modalReview.comment}
                  onChange={(e) => setModalReview({ ...modalReview, comment: e.target.value })}
                  required
                />
              </div>

              <div className="form-row-two">
                <div className="checkbox-wrap">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalReview.verified}
                      onChange={(e) => setModalReview({ ...modalReview, verified: e.target.checked })}
                    />
                    <span>Verified Customer Review</span>
                  </label>
                </div>

                <div className="checkbox-wrap">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalReview.isActive}
                      onChange={(e) => setModalReview({ ...modalReview, isActive: e.target.checked })}
                    />
                    <span>Display on Public Website Testimonials</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setModalReview(null)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  <Save size={16} />
                  <span>{isSaving ? 'Saving...' : modalReview.isNew ? 'Add Review' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="admin-modal-card modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Review Deletion</h3>
              <button className="modal-close-btn" onClick={() => setDeleteTarget(null)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="text-sm text-slate-700">
                Are you sure you want to permanently delete the review from <strong>"{deleteTarget.customerName}"</strong>?
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline-dark"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary bg-red-600 hover:bg-red-700"
                onClick={handleDeleteReview}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
