import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  Video,
  Play
} from 'lucide-react';
import { fetchAdminGallery, createAdminGallery, updateAdminGallery, deleteAdminGallery } from '../../utils/api';

export default function GalleryTab() {
  const [gallery, setGallery] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [modalItem, setModalItem] = useState(null); // { isNew, ...fields }
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadGallery = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAdminGallery();
      setGallery(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load gallery items.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const handleOpenAdd = () => {
    setModalError('');
    setModalSuccess('');
    setModalItem({
      isNew: true,
      title: '',
      category: 'Workshop Operations',
      image: '/images/gallery/tour1.jpg',
      description: '',
      type: 'image',
      videoUrl: '',
      badge: '',
      sortOrder: 0,
      isActive: true
    });
  };

  const handleOpenEdit = (item) => {
    setModalError('');
    setModalSuccess('');
    setModalItem({
      isNew: false,
      id: item._id,
      title: item.title || '',
      category: item.category || 'Workshop Operations',
      image: item.image || '',
      description: item.description || '',
      type: item.type || 'image',
      videoUrl: item.videoUrl || '',
      badge: item.badge || '',
      sortOrder: item.sortOrder || 0,
      isActive: item.isActive !== undefined ? Boolean(item.isActive) : true
    });
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!modalItem) return;

    if (!modalItem.title.trim() || !modalItem.category.trim() || !modalItem.image.trim()) {
      setModalError('Title, Category, and Media Image URL are required.');
      return;
    }

    setIsSaving(true);
    setModalError('');
    setModalSuccess('');

    const payload = {
      title: modalItem.title.trim(),
      category: modalItem.category.trim(),
      image: modalItem.image.trim(),
      description: modalItem.description.trim(),
      type: modalItem.type,
      videoUrl: modalItem.videoUrl.trim(),
      badge: modalItem.badge.trim(),
      sortOrder: Number(modalItem.sortOrder) || 0,
      isActive: modalItem.isActive
    };

    try {
      if (modalItem.isNew) {
        await createAdminGallery(payload);
        setModalSuccess('New gallery media created successfully!');
      } else {
        await updateAdminGallery(modalItem.id, payload);
        setModalSuccess('Gallery item updated successfully!');
      }

      setTimeout(() => {
        setModalItem(null);
        loadGallery();
      }, 1000);
    } catch (err) {
      setModalError(err.message || 'Failed to save gallery item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAdminGallery(deleteTarget._id);
      setDeleteTarget(null);
      loadGallery();
    } catch (err) {
      alert('Failed to delete item: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredGallery = gallery.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="tab-pane-container">
      {/* Cloud Storage Notice */}
      <div className="admin-alert-banner alert-info">
        <ImageIcon size={18} />
        <div>
          <strong>Media Asset Storage Policy:</strong> Images are hosted via standard path references.
          Direct heavy binary blobs are not stored inside MongoDB to preserve database performance.
        </div>
      </div>

      {/* Toolbar */}
      <div className="filter-toolbar-card">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search gallery media by title or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-actions-row">
          <button className="btn btn-outline-dark btn-sm" onClick={loadGallery}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Add Media Item</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Gallery Cards Grid */}
      {isLoading ? (
        <div className="tab-loading-state">
          <div className="loading-spinner" />
          <p>Loading workshop gallery...</p>
        </div>
      ) : filteredGallery.length === 0 ? (
        <div className="admin-content-card empty-card">
          <ImageIcon size={36} className="empty-icon" />
          <h4 className="empty-title">No gallery items found</h4>
          <p className="empty-sub">
            {searchQuery ? 'Try clearing your search query.' : 'Click "Add Media Item" to showcase workshop photos.'}
          </p>
        </div>
      ) : (
        <div className="gallery-admin-grid">
          {filteredGallery.map((item) => (
            <div key={item._id} className={`gallery-admin-card ${!item.isActive ? 'item-inactive' : ''}`}>
              <div className="gallery-thumb-wrap">
                <img
                  src={item.image}
                  alt={item.title}
                  className="gallery-thumb-img"
                  onError={(e) => {
                    e.target.src = '/images/logo.png';
                  }}
                />
                {item.type === 'video' && (
                  <div className="video-overlay-badge" title="Video Showcase">
                    <Play size={16} fill="white" />
                  </div>
                )}
                {item.badge && <span className="gallery-card-badge">{item.badge}</span>}
              </div>

              <div className="gallery-card-body">
                <div className="gallery-category-line">
                  <span className="category-badge">{item.category}</span>
                  {!item.isActive && <span className="provisional-tag">Hidden</span>}
                </div>
                <h4 className="gallery-card-title">{item.title}</h4>
                {item.description && <p className="gallery-card-desc">{item.description}</p>}

                <div className="gallery-card-actions">
                  <button
                    className="btn btn-outline-dark btn-sm"
                    onClick={() => handleOpenEdit(item)}
                    title="Edit Item"
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => setDeleteTarget(item)}
                    title="Delete Item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {modalItem && (
        <div className="admin-modal-backdrop" onClick={() => setModalItem(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalItem.isNew ? 'Add Gallery Item' : `Edit: ${modalItem.title}`}
              </h3>
              <button className="modal-close-btn" onClick={() => setModalItem(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="modal-body">
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

              <div className="form-group">
                <label className="input-label">
                  <span>Media Title:</span>
                </label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="e.g. Scorpio-N Engine Carbon Cleaning"
                  value={modalItem.title}
                  onChange={(e) => setModalItem({ ...modalItem, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label className="input-label">
                    <span>Category:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. Machinery, Workshop Tour, Engine Care"
                    value={modalItem.category}
                    onChange={(e) => setModalItem({ ...modalItem, category: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">
                    <span>Media Type:</span>
                  </label>
                  <select
                    className="filter-select w-full"
                    value={modalItem.type}
                    onChange={(e) => setModalItem({ ...modalItem, type: e.target.value })}
                  >
                    <option value="image">Still Image</option>
                    <option value="video">Video Showcase</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Image Thumbnail / Poster URL:</span>
                </label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="/images/gallery/photo1.jpg"
                  value={modalItem.image}
                  onChange={(e) => setModalItem({ ...modalItem, image: e.target.value })}
                  required
                />
              </div>

              {modalItem.type === 'video' && (
                <div className="form-group">
                  <label className="input-label">
                    <span>Video Stream / YouTube Embed URL:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="https://www.youtube.com/embed/..."
                    value={modalItem.videoUrl}
                    onChange={(e) => setModalItem({ ...modalItem, videoUrl: e.target.value })}
                  />
                </div>
              )}

              <div className="form-row-two">
                <div className="form-group">
                  <label className="input-label">
                    <span>Badge Label (Optional):</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. Latest Machine / Video Tour"
                    value={modalItem.badge}
                    onChange={(e) => setModalItem({ ...modalItem, badge: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">
                    <span>Display Order:</span>
                  </label>
                  <input
                    type="number"
                    className="login-input"
                    value={modalItem.sortOrder}
                    onChange={(e) => setModalItem({ ...modalItem, sortOrder: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Description (Optional):</span>
                </label>
                <textarea
                  className="login-input"
                  rows={2}
                  placeholder="Brief caption for the website gallery carousel..."
                  value={modalItem.description}
                  onChange={(e) => setModalItem({ ...modalItem, description: e.target.value })}
                />
              </div>

              <div className="checkbox-wrap mt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalItem.isActive}
                    onChange={(e) => setModalItem({ ...modalItem, isActive: e.target.checked })}
                  />
                  <span>Active on Public Website Gallery</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setModalItem(null)}
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
                  <span>{isSaving ? 'Saving...' : modalItem.isNew ? 'Add to Gallery' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="admin-modal-card modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Deletion</h3>
              <button className="modal-close-btn" onClick={() => setDeleteTarget(null)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="text-sm text-slate-700">
                Are you sure you want to permanently delete gallery item <strong>"{deleteTarget.title}"</strong>?
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
                onClick={handleDeleteItem}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Media'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
