import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Car,
  User,
  Phone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileText,
  AlertCircle
} from 'lucide-react';
import { fetchAppointments, fetchAppointmentById, updateAppointmentStatus } from '../../utils/api';

const VALID_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'REJECTED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'REJECTED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: []
};

export default function AppointmentsTab({
  initialStatus = 'ALL',
  selectedAppointmentId = null,
  onClearSelectedId,
  onConvertToJobCard
}) {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Details Modal State
  const [detailsModalAppt, setDetailsModalAppt] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Status Change Confirmation Modal State
  const [statusModalConfig, setStatusModalConfig] = useState(null); // { appointmentId, targetStatus, currentStatus }
  const [statusReason, setStatusReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusActionError, setStatusActionError] = useState('');

  const loadAppointments = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchAppointments({
        page,
        limit: 15,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
        dateFrom: dateFilter || undefined,
        dateTo: dateFilter || undefined
      });
      setAppointments(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load appointments.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, dateFilter]);

  useEffect(() => {
    loadAppointments(1);
  }, [loadAppointments]);

  // Open details if passed from outside
  useEffect(() => {
    if (selectedAppointmentId) {
      handleOpenDetails(selectedAppointmentId);
      if (onClearSelectedId) onClearSelectedId();
    }
  }, [selectedAppointmentId]);

  const handleOpenDetails = async (id) => {
    setIsLoadingDetails(true);
    try {
      const appt = await fetchAppointmentById(id);
      setDetailsModalAppt(appt);
    } catch (err) {
      alert('Failed to load appointment details: ' + err.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleInitiateStatusChange = (appt, nextStatus) => {
    setStatusActionError('');
    setStatusReason('');
    setAdminNotes(appt.adminNotes || '');
    setStatusModalConfig({
      appointmentId: appt._id,
      bookingReference: appt.bookingReference,
      currentStatus: appt.status,
      targetStatus: nextStatus
    });
  };

  const handleConfirmStatusChange = async (e) => {
    e.preventDefault();
    if (!statusModalConfig) return;

    setIsUpdatingStatus(true);
    setStatusActionError('');
    try {
      await updateAppointmentStatus(statusModalConfig.appointmentId, {
        status: statusModalConfig.targetStatus,
        reason: statusReason.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined
      });

      // Update in details modal if open
      if (detailsModalAppt && detailsModalAppt._id === statusModalConfig.appointmentId) {
        const updated = await fetchAppointmentById(statusModalConfig.appointmentId);
        setDetailsModalAppt(updated);
      }

      setStatusModalConfig(null);
      loadAppointments(pagination.page);
    } catch (err) {
      setStatusActionError(err.message || 'Failed to transition appointment status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const isSunday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getDay() === 0;
  };

  return (
    <div className="tab-pane-container">
      {/* Search and Filter Controls */}
      <div className="filter-toolbar-card">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search by reference (e.g. MHG-...), customer name, phone, or plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-actions-row">
          <div className="select-wrap">
            <Filter size={16} className="select-icon" />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="date-filter-wrap">
            <Calendar size={16} className="date-icon" />
            <input
              type="date"
              className="filter-date-input"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              title="Filter by preferred appointment date"
            />
            {dateFilter && (
              <button className="clear-date-btn" onClick={() => setDateFilter('')} title="Clear date">
                ×
              </button>
            )}
          </div>

          <button className="btn btn-outline-dark btn-sm" onClick={() => loadAppointments(pagination.page)}>
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

      {/* Table & Cards */}
      {isLoading ? (
        <div className="tab-loading-state">
          <div className="loading-spinner" />
          <p>Loading appointments registry...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="admin-content-card empty-card">
          <Calendar size={36} className="empty-icon" />
          <h4 className="empty-title">No appointments found</h4>
          <p className="empty-sub">
            {searchQuery || statusFilter !== 'ALL' || dateFilter
              ? 'Try adjusting your search criteria or status filter.'
              : 'New customer bookings will appear here.'}
          </p>
        </div>
      ) : (
        <div className="admin-content-card no-padding">
          <div className="table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Scheduled Date</th>
                  <th>Services</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => {
                  const allowedNext = VALID_TRANSITIONS[appt.status] || [];
                  const isTerminal = allowedNext.length === 0;
                  const hasConflict = appt.registrationConflict;
                  const isSundayDate = isSunday(appt.preferredDate);

                  return (
                    <tr key={appt._id} className={hasConflict ? 'tr-warning' : ''}>
                      <td>
                        <span className="booking-ref-badge">{appt.bookingReference}</span>
                        {hasConflict && (
                          <span className="conflict-tag" title="Registration plate conflict flagged">
                            <ShieldAlert size={12} /> Conflict
                          </span>
                        )}
                        {appt.isProvisional && (
                          <span className="provisional-tag" title="Provisional vehicle record (no plate registered)">
                            Provisional
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="cust-cell">
                          <span className="cust-name">
                            {appt.customerSnapshot?.fullName || appt.customerId?.fullName || 'N/A'}
                          </span>
                          <span className="cust-phone">
                            <Phone size={12} />
                            {appt.customerSnapshot?.mobileNumber || appt.customerId?.mobileNumber || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="veh-cell">
                          <span className="veh-name">
                            {appt.vehicleSnapshot?.brand} {appt.vehicleSnapshot?.model}
                          </span>
                          <span className="veh-plate">
                            {appt.vehicleSnapshot?.registrationNumber || 'Unregistered Plate'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="date-cell">
                          <span className="date-text">
                            {new Date(appt.preferredDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="slot-text">{appt.preferredTimeSlot}</span>
                          {isSundayDate && (
                            <span className="sunday-tag" title="Sunday appointment - requires confirmation (10 AM - 4 PM)">
                              Sunday Hours
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="service-pills">
                          {(appt.servicesSnapshot || []).map((s, idx) => (
                            <span key={idx} className="service-pill" title={s.priceDisplay}>
                              {s.title}
                            </span>
                          ))}
                          {(!appt.servicesSnapshot || appt.servicesSnapshot.length === 0) && (
                            <span className="text-muted text-xs">Custom Request</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge badge-${(appt.status || 'PENDING').toLowerCase()}`}>
                          {appt.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-wrap">
                          <button
                            className="btn-action-icon"
                            onClick={() => handleOpenDetails(appt._id)}
                            title="View Full Dossier"
                          >
                            <Eye size={16} />
                          </button>

                          {/* State Transition Actions */}
                          {!isTerminal && (
                            <div className="status-quick-actions">
                              {allowedNext.includes('CONFIRMED') && (
                                <button
                                  className="btn-status-action btn-status-confirm"
                                  onClick={() => handleInitiateStatusChange(appt, 'CONFIRMED')}
                                  title="Confirm Appointment"
                                >
                                  Confirm
                                </button>
                              )}
                              {appt.status === 'CONFIRMED' && onConvertToJobCard && (
                                <button
                                  className="btn-status-action"
                                  style={{ background: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D' }}
                                  onClick={() => onConvertToJobCard(appt._id)}
                                  title="Create Job Card from this Confirmed Appointment"
                                >
                                  + Job Card
                                </button>
                              )}
                              {allowedNext.includes('IN_PROGRESS') && (
                                <button
                                  className="btn-status-action btn-status-progress"
                                  onClick={() => handleInitiateStatusChange(appt, 'IN_PROGRESS')}
                                  title="Mark In Progress"
                                >
                                  Start Bay
                                </button>
                              )}
                              {allowedNext.includes('COMPLETED') && (
                                <button
                                  className="btn-status-action btn-status-complete"
                                  onClick={() => handleInitiateStatusChange(appt, 'COMPLETED')}
                                  title="Mark Completed"
                                >
                                  Complete
                                </button>
                              )}
                              {allowedNext.includes('CANCELLED') && (
                                <button
                                  className="btn-status-action btn-status-cancel"
                                  onClick={() => handleInitiateStatusChange(appt, 'CANCELLED')}
                                  title="Cancel Appointment"
                                >
                                  Cancel
                                </button>
                              )}
                              {allowedNext.includes('REJECTED') && (
                                <button
                                  className="btn-status-action btn-status-reject"
                                  onClick={() => handleInitiateStatusChange(appt, 'REJECTED')}
                                  title="Reject Request"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="table-pagination-bar">
              <span className="pagination-info">
                Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total appointments)
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn-pagination"
                  disabled={pagination.page <= 1}
                  onClick={() => loadAppointments(pagination.page - 1)}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  className="btn-pagination"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadAppointments(pagination.page + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* APPOINTMENT DOSSIER MODAL */}
      {detailsModalAppt && (
        <div className="admin-modal-backdrop" onClick={() => setDetailsModalAppt(null)}>
          <div className="admin-modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Appointment Dossier: {detailsModalAppt.bookingReference}</h3>
                <span className={`status-badge badge-${(detailsModalAppt.status || 'PENDING').toLowerCase()}`}>
                  {detailsModalAppt.status}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setDetailsModalAppt(null)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Conflict Alert Banner if flagged */}
              {detailsModalAppt.registrationConflict && (
                <div className="admin-alert-banner alert-warning">
                  <ShieldAlert size={20} />
                  <div>
                    <strong>Registration Plate Discrepancy Flagged:</strong>
                    <p className="text-xs">
                      The vehicle registration plate entered during booking belongs to another customer in the registry.
                      Staff must physically inspect vehicle registration papers upon arrival.
                    </p>
                  </div>
                </div>
              )}

              {/* Sunday Notice if preferredDate is Sunday */}
              {isSunday(detailsModalAppt.preferredDate) && (
                <div className="admin-alert-banner alert-info">
                  <Clock size={18} />
                  <span>Sunday Appointment: Standard garage hours on Sunday are 10:00 AM – 04:00 PM. Prior staff confirmation required.</span>
                </div>
              )}

              <div className="dossier-grid">
                {/* Customer Snapshot */}
                <div className="dossier-card">
                  <h4 className="dossier-card-title">
                    <User size={16} />
                    <span>Customer Information</span>
                  </h4>
                  <div className="dossier-data-list">
                    <div className="dossier-row">
                      <span className="dossier-k">Full Name:</span>
                      <span className="dossier-v">{detailsModalAppt.customerSnapshot?.fullName || 'N/A'}</span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">Mobile Number:</span>
                      <span className="dossier-v">{detailsModalAppt.customerSnapshot?.mobileNumber || 'N/A'}</span>
                    </div>
                    {detailsModalAppt.customerSnapshot?.email && (
                      <div className="dossier-row">
                        <span className="dossier-k">Email:</span>
                        <span className="dossier-v">{detailsModalAppt.customerSnapshot.email}</span>
                      </div>
                    )}
                    {detailsModalAppt.customerId?.totalBookingsCount !== undefined && (
                      <div className="dossier-row">
                        <span className="dossier-k">Visit History:</span>
                        <span className="dossier-v">{detailsModalAppt.customerId.totalBookingsCount} total visits</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Snapshot */}
                <div className="dossier-card">
                  <h4 className="dossier-card-title">
                    <Car size={16} />
                    <span>Vehicle Information</span>
                  </h4>
                  <div className="dossier-data-list">
                    <div className="dossier-row">
                      <span className="dossier-k">Make & Model:</span>
                      <span className="dossier-v">
                        {detailsModalAppt.vehicleSnapshot?.brand} {detailsModalAppt.vehicleSnapshot?.model}
                      </span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">Registration Plate:</span>
                      <span className="dossier-v">
                        {detailsModalAppt.vehicleSnapshot?.registrationNumber || 'Unplated / Provisional'}
                      </span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">Provisional Record:</span>
                      <span className="dossier-v">{detailsModalAppt.isProvisional ? 'Yes (Temporary)' : 'No (Globally Registered)'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Details & Problem Description */}
              <div className="dossier-card mt-3">
                <h4 className="dossier-card-title">
                  <FileText size={16} />
                  <span>Requested Services & Customer Note</span>
                </h4>
                <div className="selected-services-list">
                  {(detailsModalAppt.servicesSnapshot || []).map((s, idx) => (
                    <div key={idx} className="service-detail-item">
                      <div className="s-header">
                        <strong>{s.title}</strong>
                        <span className="s-price">{s.priceDisplay}</span>
                      </div>
                      {s.shortDesc && <p className="s-desc">{s.shortDesc}</p>}
                    </div>
                  ))}
                </div>

                {detailsModalAppt.problemDescription && (
                  <div className="problem-box">
                    <strong>Customer Problem Description:</strong>
                    <p>{detailsModalAppt.problemDescription}</p>
                  </div>
                )}

                {detailsModalAppt.adminNotes && (
                  <div className="admin-notes-box">
                    <strong>Internal Staff / Garage Notes:</strong>
                    <p>{detailsModalAppt.adminNotes}</p>
                  </div>
                )}
              </div>

              {/* Status Timeline */}
              {detailsModalAppt.statusTimeline && detailsModalAppt.statusTimeline.length > 0 && (
                <div className="dossier-card mt-3">
                  <h4 className="dossier-card-title">
                    <Clock size={16} />
                    <span>Lifecycle State History</span>
                  </h4>
                  <div className="timeline-trail">
                    {detailsModalAppt.statusTimeline.map((item, idx) => (
                      <div key={idx} className="timeline-node">
                        <div className="timeline-dot" />
                        <div className="timeline-body">
                          <div className="timeline-headline">
                            <span className="node-status">{item.status}</span>
                            <span className="node-date">
                              {new Date(item.timestamp).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <span className="node-actor">
                            Changed by: {item.changedBy?.fullName || 'Staff'} ({item.role})
                          </span>
                          {item.reason && <p className="node-reason">Reason: {item.reason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {detailsModalAppt.status === 'CONFIRMED' && onConvertToJobCard && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const apptId = detailsModalAppt._id;
                    setDetailsModalAppt(null);
                    onConvertToJobCard(apptId);
                  }}
                >
                  Convert to Job Card →
                </button>
              )}
              <button className="btn btn-outline-dark" onClick={() => setDetailsModalAppt(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS TRANSITION CONFIRMATION MODAL */}
      {statusModalConfig && (
        <div className="admin-modal-backdrop" onClick={() => setStatusModalConfig(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Status Transition</h3>
              <button className="modal-close-btn" onClick={() => setStatusModalConfig(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmStatusChange} className="modal-body">
              <p className="modal-explainer">
                Transition booking <strong>{statusModalConfig.bookingReference}</strong> from{' '}
                <span className="text-amber-500 font-semibold">{statusModalConfig.currentStatus}</span> to{' '}
                <span className="text-emerald-500 font-semibold">{statusModalConfig.targetStatus}</span>?
              </p>

              {statusActionError && (
                <div className="admin-alert-banner alert-danger">
                  <AlertCircle size={16} />
                  <span>{statusActionError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="input-label">
                  <span>Operational Reason (Optional):</span>
                </label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="e.g. Assigned to Bay 2 with master mechanic"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="input-label">
                  <span>Internal Staff Notes:</span>
                </label>
                <textarea
                  className="login-input"
                  rows={2}
                  placeholder="Notes for workshop technicians..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setStatusModalConfig(null)}
                  disabled={isUpdatingStatus}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? 'Transitioning...' : `Confirm → ${statusModalConfig.targetStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
