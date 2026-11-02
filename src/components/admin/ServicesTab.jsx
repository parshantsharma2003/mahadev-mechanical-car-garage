import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Edit3,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  Tag
} from 'lucide-react';
import { fetchAdminServices, createAdminService, updateAdminService, toggleAdminService } from '../../utils/api';

export default function ServicesTab() {
  const [services, setServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [modalService, setModalService] = useState(null); // { isNew, ...fields }
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const loadServices = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAdminServices();
      setServices(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load services catalogue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleToggleActive = async (id) => {
    try {
      await toggleAdminService(id);
      loadServices();
    } catch (err) {
      alert('Failed to toggle service status: ' + err.message);
    }
  };

  const handleOpenAdd = () => {
    setModalError('');
    setModalSuccess('');
    setModalService({
      isNew: true,
      title: '',
      slug: '',
      shortDesc: '',
      fullDesc: '',
      priceDisplay: 'Contact for Quote',
      basePrice: 0,
      category: 'Periodic Service',
      timeEstimate: '1 - 2 Hours',
      image: '/images/periodic-service.jpg',
      tag: 'Popular',
      icon: 'Wrench',
      highlightsText: 'OEM Parts, 40-Point Safety Check, Fluid Inspection',
      isPopular: false,
      isCoreService: true,
      isActive: true,
      sortOrder: 0
    });
  };

  const handleOpenEdit = (svc) => {
    setModalError('');
    setModalSuccess('');
    setModalService({
      isNew: false,
      id: svc._id,
      title: svc.title || '',
      slug: svc.slug || '',
      shortDesc: svc.shortDesc || '',
      fullDesc: svc.fullDesc || '',
      priceDisplay: svc.priceDisplay || 'Contact for Quote',
      basePrice: svc.basePrice || 0,
      category: svc.category || 'General',
      timeEstimate: svc.timeEstimate || '1 - 2 Hours',
      image: svc.image || '/images/periodic-service.jpg',
      tag: svc.tag || '',
      icon: svc.icon || 'Wrench',
      highlightsText: Array.isArray(svc.highlights) ? svc.highlights.join(', ') : '',
      isPopular: Boolean(svc.isPopular),
      isCoreService: Boolean(svc.isCoreService),
      isActive: svc.isActive !== undefined ? Boolean(svc.isActive) : true,
      sortOrder: svc.sortOrder || 0
    });
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!modalService) return;

    if (!modalService.title.trim()) {
      setModalError('Service title is required.');
      return;
    }

    setIsSaving(true);
    setModalError('');
    setModalSuccess('');

    const highlights = modalService.highlightsText
      ? modalService.highlightsText.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      title: modalService.title.trim(),
      slug: modalService.slug.trim() || undefined,
      shortDesc: modalService.shortDesc.trim(),
      fullDesc: modalService.fullDesc.trim(),
      priceDisplay: modalService.priceDisplay.trim(),
      basePrice: Number(modalService.basePrice) || 0,
      category: modalService.category.trim(),
      timeEstimate: modalService.timeEstimate.trim(),
      image: modalService.image.trim(),
      tag: modalService.tag.trim(),
      icon: modalService.icon.trim(),
      highlights,
      isPopular: modalService.isPopular,
      isCoreService: modalService.isCoreService,
      isActive: modalService.isActive,
      sortOrder: Number(modalService.sortOrder) || 0
    };

    try {
      if (modalService.isNew) {
        await createAdminService(payload);
        setModalSuccess('New service created successfully!');
      } else {
        await updateAdminService(modalService.id, payload);
        setModalSuccess('Service catalogue updated successfully!');
      }

      setTimeout(() => {
        setModalService(null);
        loadServices();
      }, 1000);
    } catch (err) {
      setModalError(err.message || 'Failed to save service.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q) ||
      (s.shortDesc || '').toLowerCase().includes(q)
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
            placeholder="Search services by title, category, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-actions-row">
          <button className="btn btn-outline-dark btn-sm" onClick={loadServices}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Add New Service</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Services Grid / Table */}
      {isLoading ? (
        <div className="tab-loading-state">
          <div className="loading-spinner" />
          <p>Loading workshop service catalogue...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="admin-content-card empty-card">
          <Wrench size={36} className="empty-icon" />
          <h4 className="empty-title">No services found</h4>
          <p className="empty-sub">
            {searchQuery ? 'Try clearing your search query.' : 'Click "Add New Service" to expand the catalogue.'}
          </p>
        </div>
      ) : (
        <div className="admin-content-card no-padding">
          <div className="table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Service Title</th>
                  <th>Category</th>
                  <th>Display Price</th>
                  <th>Duration</th>
                  <th>Public Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((svc) => (
                  <tr key={svc._id} className={!svc.isActive ? 'tr-muted' : ''}>
                    <td>
                      <div className="service-title-cell">
                        <strong className="service-main-title">{svc.title}</strong>
                        {svc.tag && <span className="service-tag-badge">{svc.tag}</span>}
                        {svc.isCoreService && <span className="service-core-badge">Core Service</span>}
                        <p className="service-desc-snippet">{svc.shortDesc || 'No summary description'}</p>
                      </div>
                    </td>
                    <td>
                      <span className="category-badge">{svc.category || 'General'}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-800">{svc.priceDisplay || 'Quote'}</span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500">{svc.timeEstimate || '1 - 2 Hours'}</span>
                    </td>
                    <td>
                      <button
                        className={`btn-toggle-switch ${svc.isActive ? 'active' : ''}`}
                        onClick={() => handleToggleActive(svc._id)}
                        title={svc.isActive ? 'Click to deactivate (hide from public site)' : 'Click to activate'}
                      >
                        {svc.isActive ? (
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
                          onClick={() => handleOpenEdit(svc)}
                          title="Edit Service Details"
                        >
                          <Edit3 size={16} />
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

      {/* ADD / EDIT SERVICE MODAL */}
      {modalService && (
        <div className="admin-modal-backdrop" onClick={() => setModalService(null)}>
          <div className="admin-modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalService.isNew ? 'Add New Workshop Service' : `Edit Service: ${modalService.title}`}
              </h3>
              <button className="modal-close-btn" onClick={() => setModalService(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveService} className="modal-body">
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
                    <span>Service Title:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. 3D Laser Wheel Alignment"
                    value={modalService.title}
                    onChange={(e) => setModalService({ ...modalService, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">
                    <span>Category:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. Periodic Service, Detailing, Mechanical"
                    value={modalService.category}
                    onChange={(e) => setModalService({ ...modalService, category: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label className="input-label">
                    <span>Display Price:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. ₹499 or Starting ₹1,499"
                    value={modalService.priceDisplay}
                    onChange={(e) => setModalService({ ...modalService, priceDisplay: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">
                    <span>Estimated Duration:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. 45 - 60 Mins"
                    value={modalService.timeEstimate}
                    onChange={(e) => setModalService({ ...modalService, timeEstimate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Short Summary (Public Card):</span>
                </label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="One sentence summary of the service benefit..."
                  value={modalService.shortDesc}
                  onChange={(e) => setModalService({ ...modalService, shortDesc: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Full Description:</span>
                </label>
                <textarea
                  className="login-input"
                  rows={3}
                  placeholder="Detailed breakdown of the procedure and parts included..."
                  value={modalService.fullDesc}
                  onChange={(e) => setModalService({ ...modalService, fullDesc: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Highlights (Comma-Separated):</span>
                </label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="e.g. High Precision Cameras, OEM Specs, Free Tyre Check"
                  value={modalService.highlightsText}
                  onChange={(e) => setModalService({ ...modalService, highlightsText: e.target.value })}
                />
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label className="input-label">
                    <span>Badge Tag:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. Most Popular / Best Value"
                    value={modalService.tag}
                    onChange={(e) => setModalService({ ...modalService, tag: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">
                    <span>Image URL or Path:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="/images/services/alignment.jpg"
                    value={modalService.image}
                    onChange={(e) => setModalService({ ...modalService, image: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-two mt-2">
                <div className="checkbox-wrap">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalService.isCoreService}
                      onChange={(e) => setModalService({ ...modalService, isCoreService: e.target.checked })}
                    />
                    <span>Mark as Core Workshop Service</span>
                  </label>
                </div>

                <div className="checkbox-wrap">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalService.isActive}
                      onChange={(e) => setModalService({ ...modalService, isActive: e.target.checked })}
                    />
                    <span>Active on Public Website Catalogue</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setModalService(null)}
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
                  <span>{isSaving ? 'Saving...' : modalService.isNew ? 'Create Service' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
