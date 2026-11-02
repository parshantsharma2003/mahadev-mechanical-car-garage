import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Car,
  User,
  Phone,
  ShieldAlert,
  AlertCircle,
  Eye,
  Edit3,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  ArrowRightLeft
} from 'lucide-react';
import { fetchVehicles, fetchVehicleById, updateVehicle, transferVehicleOwner, fetchCustomers } from '../../utils/api';

export default function VehiclesTab() {
  const [vehicles, setVehicles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [provisionalFilter, setProvisionalFilter] = useState('ALL'); // 'ALL' | 'PROVISIONAL' | 'REGISTERED'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Vehicle Details Dossier
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Edit / Plate Correction Modal
  const [editVehicleForm, setEditVehicleForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Ownership Transfer Modal
  const [transferModal, setTransferModal] = useState(null); // { vehicleId, brand, model, plate, currentCustomer }
  const [transferCustomerSearch, setTransferCustomerSearch] = useState('');
  const [targetCustomerOptions, setTargetCustomerOptions] = useState([]);
  const [selectedTargetCustomer, setSelectedTargetCustomer] = useState(null);
  const [transferReason, setTransferReason] = useState('');
  const [confirmTransferCheck, setConfirmTransferCheck] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');

  const loadVehicles = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const isProv = provisionalFilter === 'PROVISIONAL' ? true : (provisionalFilter === 'REGISTERED' ? false : undefined);
      const res = await fetchVehicles({
        page,
        limit: 15,
        search: searchQuery.trim() || undefined,
        isProvisional: isProv
      });
      setVehicles(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load vehicle registry.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, provisionalFilter]);

  useEffect(() => {
    loadVehicles(1);
  }, [loadVehicles]);

  const handleOpenDetails = async (id) => {
    setIsLoadingDetails(true);
    try {
      const data = await fetchVehicleById(id);
      setSelectedVehicle(data);
    } catch (err) {
      alert('Failed to load vehicle details: ' + err.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleOpenEdit = (v) => {
    setSaveError('');
    setSaveSuccess('');
    setEditVehicleForm({
      id: v._id,
      brand: v.brand || '',
      model: v.model || '',
      registrationNumber: v.registrationNumberDisplay || v.registrationNumberClean || '',
      fuelType: v.fuelType || 'OTHER',
      color: v.color || '',
      manufacturingYear: v.manufacturingYear || '',
      notes: v.notes || ''
    });
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    if (!editVehicleForm) return;

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await updateVehicle(editVehicleForm.id, {
        brand: editVehicleForm.brand.trim(),
        model: editVehicleForm.model.trim(),
        registrationNumber: editVehicleForm.registrationNumber.trim() || undefined,
        fuelType: editVehicleForm.fuelType,
        color: editVehicleForm.color.trim() || undefined,
        manufacturingYear: editVehicleForm.manufacturingYear ? Number(editVehicleForm.manufacturingYear) : undefined,
        notes: editVehicleForm.notes.trim() || undefined
      });

      setSaveSuccess('Vehicle specifications updated successfully!');
      setTimeout(() => {
        setEditVehicleForm(null);
        loadVehicles(pagination.page);
        if (selectedVehicle && selectedVehicle._id === editVehicleForm.id) {
          handleOpenDetails(editVehicleForm.id);
        }
      }, 1000);
    } catch (err) {
      setSaveError(err.message || 'Failed to update vehicle.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenTransfer = (v) => {
    setTransferError('');
    setTransferReason('');
    setConfirmTransferCheck(false);
    setSelectedTargetCustomer(null);
    setTargetCustomerOptions([]);
    setTransferCustomerSearch('');
    setTransferModal({
      vehicleId: v._id,
      brand: v.brand,
      model: v.model,
      plate: v.registrationNumberDisplay || v.registrationNumberClean || 'Unplated',
      currentCustomer: v.customerId
    });
  };

  const handleSearchTargetCustomers = async (query) => {
    setTransferCustomerSearch(query);
    if (!query || query.trim().length < 2) {
      setTargetCustomerOptions([]);
      return;
    }
    try {
      const res = await fetchCustomers({ search: query.trim(), limit: 5 });
      setTargetCustomerOptions(res.data || []);
    } catch (err) {
      console.warn('Customer search error:', err);
    }
  };

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!transferModal || !selectedTargetCustomer) {
      setTransferError('Please search and select a valid target customer.');
      return;
    }
    if (!confirmTransferCheck || !transferReason.trim()) {
      setTransferError('Please provide a transfer reason and check the confirmation box.');
      return;
    }

    setIsTransferring(true);
    setTransferError('');
    try {
      await transferVehicleOwner(transferModal.vehicleId, {
        customerId: selectedTargetCustomer._id,
        confirmOwnershipTransfer: true,
        transferReason: transferReason.trim()
      });

      alert(`Vehicle successfully transferred to ${selectedTargetCustomer.fullName}!`);
      setTransferModal(null);
      loadVehicles(pagination.page);
    } catch (err) {
      setTransferError(err.message || 'Failed to execute ownership transfer.');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="tab-pane-container">
      {/* Toolbar */}
      <div className="filter-toolbar-card">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search vehicles by registration plate, brand, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-actions-row">
          <div className="select-wrap">
            <select
              className="filter-select"
              value={provisionalFilter}
              onChange={(e) => setProvisionalFilter(e.target.value)}
            >
              <option value="ALL">All Vehicles</option>
              <option value="REGISTERED">With Verified Plate</option>
              <option value="PROVISIONAL">Provisional (No Plate)</option>
            </select>
          </div>

          <button className="btn btn-outline-dark btn-sm" onClick={() => loadVehicles(pagination.page)}>
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
          <p>Loading vehicle registry...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="admin-content-card empty-card">
          <Car size={36} className="empty-icon" />
          <h4 className="empty-title">No vehicles found</h4>
          <p className="empty-sub">
            {searchQuery || provisionalFilter !== 'ALL'
              ? 'Try adjusting your search query or vehicle type filter.'
              : 'Vehicles are registered as customers book appointments.'}
          </p>
        </div>
      ) : (
        <div className="admin-content-card no-padding">
          <div className="table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Registration Plate</th>
                  <th>Vehicle Model</th>
                  <th>Fuel Type</th>
                  <th>Registered Owner</th>
                  <th>Owner Mobile</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v._id}>
                    <td>
                      <span className="font-mono font-bold text-sm">
                        {v.registrationNumberDisplay || v.registrationNumberClean || 'Unplated'}
                      </span>
                    </td>
                    <td>
                      <div className="veh-cell">
                        <span className="veh-name font-semibold">{v.brand} {v.model}</span>
                        {v.color && <span className="text-xs text-slate-500">{v.color}</span>}
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-medium text-slate-600">{v.fuelType || 'OTHER'}</span>
                    </td>
                    <td>
                      <span className="cust-name font-medium">
                        {v.customerId?.fullName || 'Unknown Customer'}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs">
                        {v.customerId?.mobileNumber || '—'}
                      </span>
                    </td>
                    <td>
                      {v.isProvisional ? (
                        <span className="provisional-tag" title="Provisional vehicle record without unique plate">
                          Provisional
                        </span>
                      ) : (
                        <span className="status-badge-inline badge-confirmed">
                          Registered
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons-wrap">
                        <button
                          className="btn-action-icon"
                          onClick={() => handleOpenDetails(v._id)}
                          title="View Full Vehicle Dossier"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn-action-icon"
                          onClick={() => handleOpenEdit(v)}
                          title="Edit Specs or Correct Plate"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="btn-action-icon text-amber-500"
                          onClick={() => handleOpenTransfer(v)}
                          title="Audited Ownership Transfer"
                        >
                          <ArrowRightLeft size={16} />
                        </button>
                      </div>
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
                Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} registered vehicles)
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn-pagination"
                  disabled={pagination.page <= 1}
                  onClick={() => loadVehicles(pagination.page - 1)}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  className="btn-pagination"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadVehicles(pagination.page + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VEHICLE DOSSIER MODAL */}
      {selectedVehicle && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedVehicle(null)}>
          <div className="admin-modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {selectedVehicle.brand} {selectedVehicle.model}
                </h3>
                <span className="font-mono text-sm text-slate-500">
                  {selectedVehicle.registrationNumberDisplay || selectedVehicle.registrationNumberClean || 'Provisional (No Plate)'}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedVehicle(null)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="dossier-grid">
                <div className="dossier-card">
                  <h4 className="dossier-card-title">
                    <Car size={16} />
                    <span>Technical Specifications</span>
                  </h4>
                  <div className="dossier-data-list">
                    <div className="dossier-row">
                      <span className="dossier-k">Make & Model:</span>
                      <span className="dossier-v font-semibold">{selectedVehicle.brand} {selectedVehicle.model}</span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">Clean Plate:</span>
                      <span className="dossier-v font-mono">{selectedVehicle.registrationNumberClean || 'None'}</span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">Display Plate:</span>
                      <span className="dossier-v font-mono">{selectedVehicle.registrationNumberDisplay || 'None'}</span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">Fuel Type:</span>
                      <span className="dossier-v">{selectedVehicle.fuelType || 'OTHER'}</span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">Body Color:</span>
                      <span className="dossier-v">{selectedVehicle.color || 'Unspecified'}</span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">Mfg Year:</span>
                      <span className="dossier-v">{selectedVehicle.manufacturingYear || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="dossier-card">
                  <h4 className="dossier-card-title">
                    <User size={16} />
                    <span>Registered Owner Information</span>
                  </h4>
                  <div className="dossier-data-list">
                    <div className="dossier-row">
                      <span className="dossier-k">Owner Name:</span>
                      <span className="dossier-v font-semibold">{selectedVehicle.customerId?.fullName || 'N/A'}</span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">Mobile:</span>
                      <span className="dossier-v font-mono">{selectedVehicle.customerId?.mobileNumber || 'N/A'}</span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">City:</span>
                      <span className="dossier-v">{selectedVehicle.customerId?.city || 'Gohana'}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <button
                      className="btn btn-outline-dark btn-sm w-full"
                      onClick={() => {
                        setSelectedVehicle(null);
                        handleOpenTransfer(selectedVehicle);
                      }}
                    >
                      <ArrowRightLeft size={14} />
                      <span>Transfer Vehicle Ownership</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Service History */}
              <div className="dossier-card mt-3">
                <h4 className="dossier-card-title">
                  <span>Service History at Mahadev Garage ({selectedVehicle.appointments?.length || 0})</span>
                </h4>
                {(!selectedVehicle.appointments || selectedVehicle.appointments.length === 0) ? (
                  <p className="text-muted text-xs mt-1">No past service appointments on record.</p>
                ) : (
                  <div className="table-responsive mt-2">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Booking Ref</th>
                          <th>Date</th>
                          <th>Customer</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVehicle.appointments.map((a) => (
                          <tr key={a._id}>
                            <td>
                              <span className="booking-ref-badge">{a.bookingReference}</span>
                            </td>
                            <td>
                              <span className="text-xs">
                                {new Date(a.preferredDate).toLocaleDateString('en-IN')}
                              </span>
                            </td>
                            <td>
                              <span className="text-xs">{a.customerId?.fullName || 'N/A'}</span>
                            </td>
                            <td>
                              <span className={`status-badge badge-${(a.status || 'PENDING').toLowerCase()}`}>
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline-dark" onClick={() => setSelectedVehicle(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT VEHICLE / PLATE CORRECTION MODAL */}
      {editVehicleForm && (
        <div className="admin-modal-backdrop" onClick={() => setEditVehicleForm(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Vehicle / Correct Plate</h3>
              <button className="modal-close-btn" onClick={() => setEditVehicleForm(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="modal-body">
              {saveError && (
                <div className="admin-alert-banner alert-danger">
                  <AlertCircle size={16} />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="admin-alert-banner alert-success">
                  <CheckCircle2 size={16} />
                  <span>{saveSuccess}</span>
                </div>
              )}

              <div className="form-group">
                <label className="input-label">
                  <span>Registration Plate (Standard Indian Plate format):</span>
                </label>
                <input
                  type="text"
                  className="login-input font-mono"
                  placeholder="e.g. HR 11 AA 1234"
                  value={editVehicleForm.registrationNumber}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, registrationNumber: e.target.value })}
                />
                <span className="text-xs text-muted mt-1 block">
                  Leave blank to revert to Provisional unplated status. Clean plate collision will be rejected.
                </span>
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label className="input-label">
                    <span>Brand / Make:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    value={editVehicleForm.brand}
                    onChange={(e) => setEditVehicleForm({ ...editVehicleForm, brand: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">
                    <span>Model:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    value={editVehicleForm.model}
                    onChange={(e) => setEditVehicleForm({ ...editVehicleForm, model: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label className="input-label">
                    <span>Fuel Type:</span>
                  </label>
                  <select
                    className="filter-select w-full"
                    value={editVehicleForm.fuelType}
                    onChange={(e) => setEditVehicleForm({ ...editVehicleForm, fuelType: e.target.value })}
                  >
                    <option value="PETROL">Petrol</option>
                    <option value="DIESEL">Diesel</option>
                    <option value="CNG">CNG</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="EV">Electric (EV)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="input-label">
                    <span>Color:</span>
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. White, Silver"
                    value={editVehicleForm.color}
                    onChange={(e) => setEditVehicleForm({ ...editVehicleForm, color: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Manufacturing Year:</span>
                </label>
                <input
                  type="number"
                  className="login-input"
                  min="1990"
                  max="2035"
                  value={editVehicleForm.manufacturingYear}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, manufacturingYear: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setEditVehicleForm(null)}
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
                  <span>{isSaving ? 'Saving...' : 'Save Plate & Specs'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDITED OWNERSHIP TRANSFER MODAL */}
      {transferModal && (
        <div className="admin-modal-backdrop" onClick={() => setTransferModal(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Explicit Vehicle Ownership Transfer</h3>
              <button className="modal-close-btn" onClick={() => setTransferModal(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="modal-body">
              <div className="admin-alert-banner alert-warning">
                <ShieldAlert size={20} />
                <div className="text-xs">
                  <strong>Audited Security Protocol:</strong> Silent reassignment is prohibited.
                  Transferring this vehicle will re-link it to the new customer and log an immutable audit record.
                </div>
              </div>

              {transferError && (
                <div className="admin-alert-banner alert-danger mt-2">
                  <AlertCircle size={16} />
                  <span>{transferError}</span>
                </div>
              )}

              <div className="problem-box mt-2">
                <strong>Vehicle:</strong> {transferModal.brand} {transferModal.model} ({transferModal.plate})
                <br />
                <strong>Current Owner:</strong> {transferModal.currentCustomer?.fullName} ({transferModal.currentCustomer?.mobileNumber})
              </div>

              <div className="form-group mt-3">
                <label className="input-label">
                  <span>Search Target Customer (by Name or Mobile):</span>
                </label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="Type customer name or mobile number..."
                  value={transferCustomerSearch}
                  onChange={(e) => handleSearchTargetCustomers(e.target.value)}
                />

                {targetCustomerOptions.length > 0 && (
                  <div className="customer-search-results">
                    {targetCustomerOptions.map((tc) => (
                      <div
                        key={tc._id}
                        className={`customer-search-option ${selectedTargetCustomer?._id === tc._id ? 'selected' : ''}`}
                        onClick={() => setSelectedTargetCustomer(tc)}
                      >
                        <strong>{tc.fullName}</strong> • {tc.mobileNumber} ({tc.city})
                      </div>
                    ))}
                  </div>
                )}

                {selectedTargetCustomer && (
                  <div className="selected-customer-pill mt-2">
                    Selected New Owner: <strong>{selectedTargetCustomer.fullName}</strong> ({selectedTargetCustomer.mobileNumber})
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Transfer Reason (Mandatory for Audit Trail):</span>
                </label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="e.g. Sold vehicle to family member / RC transfer verified"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  required
                />
              </div>

              <div className="checkbox-wrap mt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmTransferCheck}
                    onChange={(e) => setConfirmTransferCheck(e.target.checked)}
                  />
                  <span>I authorize this explicit ownership transfer and verify documents have been reviewed.</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setTransferModal(null)}
                  disabled={isTransferring}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isTransferring || !selectedTargetCustomer || !confirmTransferCheck}
                >
                  <ArrowRightLeft size={16} />
                  <span>{isTransferring ? 'Transferring...' : 'Execute Ownership Transfer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
