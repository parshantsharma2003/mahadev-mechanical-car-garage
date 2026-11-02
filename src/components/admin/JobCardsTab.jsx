import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  Car,
  User,
  Phone,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Gauge,
  Fuel,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Edit3,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldCheck,
  XCircle,
  ExternalLink,
  Receipt
} from 'lucide-react';
import {
  fetchJobCards,
  fetchJobCardById,
  createJobCard,
  updateJobCard,
  updateJobCardStatus,
  fetchAppointments,
  fetchCustomers,
  fetchVehicles
} from '../../utils/api';
import EstimateManager from './EstimateManager';

const STATUS_CONFIG = {
  CREATED: { label: 'Created', color: 'badge-created', icon: Clock },
  INSPECTION: { label: 'Inspection', color: 'badge-inspection', icon: Eye },
  WAITING_FOR_APPROVAL: { label: 'Waiting Approval', color: 'badge-waiting_for_approval', icon: AlertCircle },
  IN_PROGRESS: { label: 'In Progress', color: 'badge-in_progress', icon: Wrench },
  QUALITY_CHECK: { label: 'Quality Check', color: 'badge-quality_check', icon: ShieldCheck },
  COMPLETED: { label: 'Completed', color: 'badge-completed', icon: CheckCircle2 },
  DELIVERED: { label: 'Delivered', color: 'badge-delivered', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'badge-cancelled', icon: XCircle }
};

const VALID_TRANSITIONS = {
  CREATED: ['INSPECTION', 'CANCELLED'],
  INSPECTION: ['WAITING_FOR_APPROVAL', 'IN_PROGRESS', 'CANCELLED'],
  WAITING_FOR_APPROVAL: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['QUALITY_CHECK', 'CANCELLED'],
  QUALITY_CHECK: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};

const FUEL_LEVELS = [
  { value: 'EMPTY', label: 'Empty (E)' },
  { value: 'RESERVE', label: 'Reserve / Warning' },
  { value: 'QUARTER', label: '1/4 Quarter' },
  { value: 'HALF', label: '1/2 Half' },
  { value: 'THREE_QUARTERS', label: '3/4 Three Quarters' },
  { value: 'FULL', label: 'Full Tank (F)' }
];

export default function JobCardsTab({ preselectedAppointmentId = null, onClearPreselected, onNavigateToBilling, isOwner = false }) {
  const [jobCards, setJobCards] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Details Modal
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editInternalNotes, setEditInternalNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Status Change Modal
  const [statusModalConfig, setStatusModalConfig] = useState(null); // { targetStatus, currentStatus, jobCardNumber }
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Inspection Edit Mode in Detail View
  const [isEditingInspection, setIsEditingInspection] = useState(false);
  const [inspectionForm, setInspectionForm] = useState({
    odometerReading: 0,
    fuelLevel: 'QUARTER',
    inspectionNotes: '',
    estimatedDeliveryAt: '',
    hasSpareWheel: true,
    hasJack: true,
    hasToolKit: true,
    exteriorNotes: ''
  });
  const [isSavingInspection, setIsSavingInspection] = useState(false);

  // Create Job Card Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState('appointment'); // 'appointment' | 'walkin'
  const [confirmedAppointments, setConfirmedAppointments] = useState([]);
  const [isLoadingAppts, setIsLoadingAppts] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState(preselectedAppointmentId || '');

  // Walk-in creation state
  const [customerSearch, setCustomerSearch] = useState('');
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerVehicles, setCustomerVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

  // Form inputs for new Job Card
  const [newOdometer, setNewOdometer] = useState(0);
  const [newFuelLevel, setNewFuelLevel] = useState('QUARTER');
  const [newComplaint, setNewComplaint] = useState('');
  const [newInspectionNotes, setNewInspectionNotes] = useState('');
  const [newEstimatedDelivery, setNewEstimatedDelivery] = useState('');
  const [newInternalNotes, setNewInternalNotes] = useState('');
  const [newCondition, setNewCondition] = useState({
    exteriorNotes: '',
    hasSpareWheel: true,
    hasJack: true,
    hasToolKit: true
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadJobCards = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchJobCards({
        page,
        limit: 15,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
        dateFrom: dateFilter || undefined,
        dateTo: dateFilter || undefined
      });
      setJobCards(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load Job Cards.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, dateFilter]);

  useEffect(() => {
    loadJobCards(1);
  }, [loadJobCards]);

  // Open modal if preselected appointment is passed
  useEffect(() => {
    if (preselectedAppointmentId) {
      setSelectedApptId(preselectedAppointmentId);
      setCreateMode('appointment');
      setShowCreateModal(true);
      if (onClearPreselected) onClearPreselected();
    }
  }, [preselectedAppointmentId, onClearPreselected]);

  // Load confirmed appointments for modal
  const loadConfirmedAppointments = async () => {
    setIsLoadingAppts(true);
    try {
      const res = await fetchAppointments({ status: 'CONFIRMED', limit: 50 });
      setConfirmedAppointments(res.data || []);
    } catch (err) {
      console.warn('Failed to load confirmed appointments:', err.message);
    } finally {
      setIsLoadingAppts(false);
    }
  };

  const handleOpenCreateModal = () => {
    setCreateError('');
    setShowCreateModal(true);
    loadConfirmedAppointments();
  };

  // Search customers for direct walk-in
  const handleSearchCustomers = async (query) => {
    setCustomerSearch(query);
    if (!query || query.length < 2) {
      setCustomersList([]);
      return;
    }
    setIsSearchingCustomers(true);
    try {
      const res = await fetchCustomers({ search: query, limit: 10 });
      setCustomersList(res.data || []);
    } catch (err) {
      console.warn('Failed searching customers:', err.message);
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  const handleSelectCustomer = async (cust) => {
    setSelectedCustomer(cust);
    setCustomersList([]);
    setCustomerSearch(`${cust.fullName} (${cust.mobileNumber})`);
    setSelectedVehicleId('');
    try {
      const res = await fetchVehicles({ customerId: cust._id, limit: 20 });
      setCustomerVehicles(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedVehicleId(res.data[0]._id);
      }
    } catch (err) {
      console.warn('Failed loading customer vehicles:', err.message);
    }
  };

  const handleCreateJobCardSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    setIsSubmittingCreate(true);

    try {
      const payload = {
        odometerReading: Number(newOdometer) || 0,
        fuelLevel: newFuelLevel,
        vehicleCondition: newCondition,
        inspectionNotes: newInspectionNotes.trim(),
        estimatedDeliveryAt: newEstimatedDelivery || null,
        internalNotes: newInternalNotes.trim()
      };

      if (createMode === 'appointment') {
        if (!selectedApptId) {
          throw new Error('Please select a confirmed appointment.');
        }
        payload.appointmentId = selectedApptId;
        if (newComplaint.trim()) {
          payload.customerComplaint = newComplaint.trim();
        }
      } else {
        if (!selectedCustomer?._id) {
          throw new Error('Please select an existing customer.');
        }
        if (!selectedVehicleId) {
          throw new Error('Please select a vehicle belonging to this customer.');
        }
        payload.customerId = selectedCustomer._id;
        payload.vehicleId = selectedVehicleId;
        payload.customerComplaint = newComplaint.trim();
      }

      const res = await createJobCard(payload);
      setShowCreateModal(false);
      resetCreateForm();
      loadJobCards(1);
      // View newly created Job Card
      if (res.data?._id) {
        handleOpenDetails(res.data._id);
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create Job Card.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedApptId('');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerVehicles([]);
    setSelectedVehicleId('');
    setNewOdometer(0);
    setNewFuelLevel('QUARTER');
    setNewComplaint('');
    setNewInspectionNotes('');
    setNewEstimatedDelivery('');
    setNewInternalNotes('');
    setNewCondition({
      exteriorNotes: '',
      hasSpareWheel: true,
      hasJack: true,
      hasToolKit: true
    });
  };

  // Details Modal handler
  const handleOpenDetails = async (id) => {
    setIsLoadingDetails(true);
    setIsEditingNotes(false);
    setIsEditingInspection(false);
    try {
      const card = await fetchJobCardById(id);
      setSelectedJobCard(card);
      setEditInternalNotes(card.internalNotes || '');
      setInspectionForm({
        odometerReading: card.odometerReading || 0,
        fuelLevel: card.fuelLevel || 'QUARTER',
        inspectionNotes: card.inspectionNotes || '',
        estimatedDeliveryAt: card.estimatedDeliveryAt
          ? new Date(card.estimatedDeliveryAt).toISOString().slice(0, 16)
          : '',
        hasSpareWheel: card.vehicleCondition?.hasSpareWheel !== false,
        hasJack: card.vehicleCondition?.hasJack !== false,
        hasToolKit: card.vehicleCondition?.hasToolKit !== false,
        exteriorNotes: card.vehicleCondition?.exteriorNotes || ''
      });
    } catch (err) {
      alert('Failed to load Job Card: ' + err.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Save Internal Notes
  const handleSaveInternalNotes = async () => {
    if (!selectedJobCard) return;
    setIsSavingNotes(true);
    try {
      const res = await updateJobCard(selectedJobCard._id, {
        internalNotes: editInternalNotes.trim()
      });
      setSelectedJobCard(res.data);
      setIsEditingNotes(false);
      loadJobCards(pagination.page);
    } catch (err) {
      alert('Failed to update notes: ' + err.message);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Save Inspection Details
  const handleSaveInspection = async (e) => {
    e.preventDefault();
    if (!selectedJobCard) return;
    setIsSavingInspection(true);
    try {
      const payload = {
        odometerReading: Number(inspectionForm.odometerReading) || 0,
        fuelLevel: inspectionForm.fuelLevel,
        inspectionNotes: inspectionForm.inspectionNotes.trim(),
        estimatedDeliveryAt: inspectionForm.estimatedDeliveryAt || null,
        vehicleCondition: {
          hasSpareWheel: inspectionForm.hasSpareWheel,
          hasJack: inspectionForm.hasJack,
          hasToolKit: inspectionForm.hasToolKit,
          exteriorNotes: inspectionForm.exteriorNotes.trim()
        }
      };
      const res = await updateJobCard(selectedJobCard._id, payload);
      setSelectedJobCard(res.data);
      setIsEditingInspection(false);
      loadJobCards(pagination.page);
    } catch (err) {
      alert('Failed to update inspection: ' + err.message);
    } finally {
      setIsSavingInspection(false);
    }
  };

  // Status transition handlers
  const handleInitiateStatusTransition = (targetStatus) => {
    setStatusError('');
    setStatusNotes('');
    setStatusModalConfig({
      jobCardId: selectedJobCard._id,
      jobCardNumber: selectedJobCard.jobCardNumber,
      currentStatus: selectedJobCard.status,
      targetStatus
    });
  };

  const handleConfirmStatusTransition = async (e) => {
    e.preventDefault();
    if (!statusModalConfig) return;
    setIsUpdatingStatus(true);
    setStatusError('');

    try {
      const res = await updateJobCardStatus(statusModalConfig.jobCardId, {
        status: statusModalConfig.targetStatus,
        notes: statusNotes.trim()
      });
      setSelectedJobCard(res.data);
      setStatusModalConfig(null);
      loadJobCards(pagination.page);
    } catch (err) {
      setStatusError(err.message || 'Status transition rejected.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="admin-tab-container">
      {/* Top Filter and Search Bar */}
      <div className="admin-content-card filter-card mb-4">
        <div className="filter-card-header">
          <div className="filter-search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by Job Card #, Customer Name, Phone, Vehicle Plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                ×
              </button>
            )}
          </div>

          <div className="filter-actions-group">
            <div className="date-picker-wrap">
              <Calendar size={16} className="date-icon" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="date-input"
                title="Filter by Received Date"
              />
              {dateFilter && (
                <button className="clear-date-btn" onClick={() => setDateFilter('')}>
                  ×
                </button>
              )}
            </div>

            <button className="btn btn-outline-dark btn-sm" onClick={() => loadJobCards(1)} title="Refresh">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button className="btn btn-primary btn-sm" onClick={handleOpenCreateModal}>
              <Plus size={16} />
              <span>New Job Card</span>
            </button>
          </div>
        </div>

        {/* Status Filter Badges Bar */}
        <div className="status-filter-pills mt-3">
          {['ALL', 'CREATED', 'INSPECTION', 'WAITING_FOR_APPROVAL', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              className={`status-pill ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'ALL' ? 'All Job Cards' : STATUS_CONFIG[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className="admin-alert-banner alert-danger mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading && (
        <div className="admin-content-card loading-card">
          <RefreshCw size={28} className="animate-spin text-amber-500 mb-2" />
          <p>Loading Workshop Job Cards...</p>
        </div>
      )}

      {!isLoading && jobCards.length === 0 && (
        <div className="admin-content-card empty-card">
          <FileText size={48} className="empty-icon text-slate-400 mb-3" />
          <h4 className="empty-title">No Workshop Job Cards Found</h4>
          <p className="empty-sub">
            {searchQuery || statusFilter !== 'ALL' || dateFilter
              ? 'No Job Cards match the current filter criteria.'
              : 'No Job Cards have been created yet. Convert a confirmed appointment or create a walk-in Job Card.'}
          </p>
          <button className="btn btn-primary mt-3" onClick={handleOpenCreateModal}>
            <Plus size={16} />
            <span>Create First Job Card</span>
          </button>
        </div>
      )}

      {!isLoading && jobCards.length > 0 && (
        <div className="admin-content-card table-responsive-card">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Job Card #</th>
                <th>Status</th>
                <th>Customer Snapshot</th>
                <th>Vehicle Snapshot</th>
                <th>Odometer / Fuel</th>
                <th>Received At</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobCards.map((card) => {
                const config = STATUS_CONFIG[card.status] || STATUS_CONFIG.CREATED;
                const StatusIcon = config.icon;

                return (
                  <tr key={card._id} className="hover:bg-slate-50 transition-colors">
                    <td>
                      <div className="font-mono font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <FileText size={15} className="text-amber-500" />
                        <span>{card.jobCardNumber}</span>
                      </div>
                      {card.appointmentId && (
                        <span className="text-[11px] text-indigo-600 block mt-0.5">
                          Ref: {card.appointmentId.bookingReference || 'Appointment'}
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={`status-badge ${config.color} flex items-center gap-1`}>
                        <StatusIcon size={12} />
                        <span>{config.label}</span>
                      </span>
                    </td>

                    <td>
                      <div className="font-semibold text-slate-900 text-sm">
                        {card.customerSnapshot?.fullName || 'Customer'}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone size={12} />
                        <span>{card.customerSnapshot?.mobileNumber}</span>
                      </div>
                    </td>

                    <td>
                      <div className="font-semibold text-slate-800 text-sm">
                        {card.vehicleSnapshot?.brand} {card.vehicleSnapshot?.model}
                      </div>
                      <div className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        {card.vehicleSnapshot?.registrationNumber || 'PROVISIONAL'}
                      </div>
                    </td>

                    <td>
                      <div className="text-xs text-slate-700 flex items-center gap-1">
                        <Gauge size={13} className="text-slate-400" />
                        <span>{card.odometerReading ? `${card.odometerReading.toLocaleString()} km` : '0 km'}</span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Fuel size={13} className="text-amber-500" />
                        <span>{card.fuelLevel || 'QUARTER'}</span>
                      </div>
                    </td>

                    <td>
                      <span className="text-xs text-slate-600">
                        {new Date(card.receivedAt || card.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {new Date(card.receivedAt || card.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </td>

                    <td className="text-right">
                      <button
                        className="btn btn-outline-dark btn-sm"
                        onClick={() => handleOpenDetails(card._id)}
                        title="View Full Job Card"
                      >
                        <Eye size={14} />
                        <span>Dossier</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="table-pagination-footer">
              <span className="pagination-info">
                Showing {jobCards.length} of {pagination.total} Job Cards (Page {pagination.page} of {pagination.totalPages})
              </span>
              <div className="pagination-btns">
                <button
                  className="btn btn-outline-dark btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadJobCards(pagination.page - 1)}
                >
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>
                <button
                  className="btn btn-outline-dark btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadJobCards(pagination.page + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* JOB CARD DOSSIER MODAL                                         */}
      {/* ============================================================== */}
      {selectedJobCard && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedJobCard(null)}>
          <div className="admin-modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="modal-title font-mono">{selectedJobCard.jobCardNumber}</h3>
                  <span className={`status-badge ${(STATUS_CONFIG[selectedJobCard.status] || STATUS_CONFIG.CREATED).color}`}>
                    {STATUS_CONFIG[selectedJobCard.status]?.label || selectedJobCard.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Received: {new Date(selectedJobCard.receivedAt || selectedJobCard.createdAt).toLocaleString('en-IN')}
                  {selectedJobCard.estimatedDeliveryAt && (
                    <span className="ml-3 text-amber-600 font-medium">
                      Est. Delivery: {new Date(selectedJobCard.estimatedDeliveryAt).toLocaleString('en-IN')}
                    </span>
                  )}
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedJobCard(null)}>
                ×
              </button>
            </div>

            <div className="modal-body space-y-4">
              {/* Linked Appointment notice */}
              {selectedJobCard.appointmentId && (
                <div className="admin-alert-banner alert-info">
                  <FileText size={18} />
                  <div>
                    <strong>Converted from Online Appointment:</strong>
                    <span className="ml-2 font-mono">{selectedJobCard.appointmentId.bookingReference}</span>
                    <span className="ml-3 text-xs">
                      (Preferred Slot: {selectedJobCard.appointmentId.preferredTimeSlot})
                    </span>
                  </div>
                </div>
              )}

              {/* SNAPSHOTS GRID */}
              <div className="dossier-grid">
                {/* Customer Snapshot */}
                <div className="dossier-card">
                  <h4 className="dossier-card-title">
                    <User size={16} />
                    <span>Customer Snapshot (Historical)</span>
                  </h4>
                  <div className="dossier-data-list">
                    <div className="dossier-row">
                      <span className="dossier-k">Full Name:</span>
                      <span className="dossier-v font-semibold">{selectedJobCard.customerSnapshot?.fullName}</span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">Mobile Number:</span>
                      <span className="dossier-v">{selectedJobCard.customerSnapshot?.mobileNumber}</span>
                    </div>
                    {selectedJobCard.customerSnapshot?.email && (
                      <div className="dossier-row">
                        <span className="dossier-k">Email:</span>
                        <span className="dossier-v">{selectedJobCard.customerSnapshot.email}</span>
                      </div>
                    )}
                    <div className="dossier-row">
                      <span className="dossier-k">City / Location:</span>
                      <span className="dossier-v">{selectedJobCard.customerSnapshot?.city || 'Gohana'}</span>
                    </div>
                    {selectedJobCard.customerSnapshot?.address && (
                      <div className="dossier-row">
                        <span className="dossier-k">Address:</span>
                        <span className="dossier-v">{selectedJobCard.customerSnapshot.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Snapshot */}
                <div className="dossier-card">
                  <h4 className="dossier-card-title">
                    <Car size={16} />
                    <span>Vehicle Snapshot (Historical)</span>
                  </h4>
                  <div className="dossier-data-list">
                    <div className="dossier-row">
                      <span className="dossier-k">Make & Model:</span>
                      <span className="dossier-v font-semibold">
                        {selectedJobCard.vehicleSnapshot?.brand} {selectedJobCard.vehicleSnapshot?.model}
                      </span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">Registration Plate:</span>
                      <span className="dossier-v font-mono font-bold text-amber-700">
                        {selectedJobCard.vehicleSnapshot?.registrationNumber || 'PROVISIONAL'}
                      </span>
                    </div>
                    <div className="dossier-row">
                      <span className="dossier-k">Fuel Type:</span>
                      <span className="dossier-v">{selectedJobCard.vehicleSnapshot?.fuelType || 'OTHER'}</span>
                    </div>
                    {selectedJobCard.vehicleSnapshot?.manufacturingYear && (
                      <div className="dossier-row">
                        <span className="dossier-k">Mfg Year:</span>
                        <span className="dossier-v">{selectedJobCard.vehicleSnapshot.manufacturingYear}</span>
                      </div>
                    )}
                    {selectedJobCard.vehicleSnapshot?.color && (
                      <div className="dossier-row">
                        <span className="dossier-k">Color:</span>
                        <span className="dossier-v">{selectedJobCard.vehicleSnapshot.color}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* WORKSHOP STATUS TRANSITION CONTROL PANEL */}
              <div className="dossier-card bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="dossier-card-title text-slate-800">
                    <Wrench size={16} />
                    <span>Workshop Work Status & Transition Gate</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    Strict Finite-State Transition System
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <div className="text-sm text-slate-600 mr-2">
                    Current: <strong>{selectedJobCard.status}</strong>
                  </div>

                  {/* Transition Action Buttons */}
                  {(VALID_TRANSITIONS[selectedJobCard.status] || []).length === 0 ? (
                    <span className="text-xs text-slate-500 italic bg-white px-2 py-1 rounded border">
                      Terminal state reached — no further transitions allowed.
                    </span>
                  ) : (
                    VALID_TRANSITIONS[selectedJobCard.status].map((target) => {
                      const cfg = STATUS_CONFIG[target] || STATUS_CONFIG.CREATED;
                      const Icon = cfg.icon;
                      const isDanger = target === 'CANCELLED';

                      return (
                        <button
                          key={target}
                          className={`btn btn-sm ${isDanger ? 'btn-outline-danger' : 'btn-primary'}`}
                          onClick={() => handleInitiateStatusTransition(target)}
                        >
                          <ArrowRight size={13} />
                          <span>Advance to {cfg.label}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* VEHICLE INSPECTION & WORKSHOP CHECKLIST */}
              <div className="dossier-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="dossier-card-title">
                    <Gauge size={16} />
                    <span>Intake Inspection & Inventory</span>
                  </h4>
                  {!isEditingInspection && (
                    <button
                      className="btn btn-outline-dark btn-sm text-xs py-1"
                      onClick={() => setIsEditingInspection(true)}
                    >
                      <Edit3 size={13} />
                      <span>Edit Inspection</span>
                    </button>
                  )}
                </div>

                {!isEditingInspection ? (
                  <div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm mb-3">
                      <div>
                        <span className="text-xs text-slate-500 block">Odometer Reading</span>
                        <strong className="text-slate-800">
                          {selectedJobCard.odometerReading ? `${selectedJobCard.odometerReading.toLocaleString()} km` : '0 km'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Fuel Level Gauge</span>
                        <strong className="text-amber-700">
                          {selectedJobCard.fuelLevel || 'QUARTER'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Inventory Present</span>
                        <span className="text-xs text-slate-700">
                          {selectedJobCard.vehicleCondition?.hasSpareWheel ? 'Spare Wheel ✓ ' : ''}
                          {selectedJobCard.vehicleCondition?.hasJack ? 'Jack ✓ ' : ''}
                          {selectedJobCard.vehicleCondition?.hasToolKit ? 'Toolkit ✓' : ''}
                          {!selectedJobCard.vehicleCondition?.hasSpareWheel &&
                           !selectedJobCard.vehicleCondition?.hasJack &&
                           !selectedJobCard.vehicleCondition?.hasToolKit && 'None recorded'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Est. Delivery</span>
                        <span className="text-xs text-slate-700 font-medium">
                          {selectedJobCard.estimatedDeliveryAt
                            ? new Date(selectedJobCard.estimatedDeliveryAt).toLocaleDateString('en-IN')
                            : 'Not scheduled'}
                        </span>
                      </div>
                    </div>

                    {selectedJobCard.inspectionNotes && (
                      <div className="inspection-notes-box text-sm mb-2 p-2.5 bg-amber-50 rounded border border-amber-200">
                        <strong className="text-xs text-amber-900 block mb-0.5">Technician Intake Inspection Notes:</strong>
                        <p className="text-slate-800 text-xs">{selectedJobCard.inspectionNotes}</p>
                      </div>
                    )}

                    {selectedJobCard.vehicleCondition?.exteriorNotes && (
                      <div className="exterior-condition-box text-sm p-2.5 bg-slate-50 rounded border border-slate-200">
                        <strong className="text-xs text-slate-700 block mb-0.5">Vehicle Exterior & Scratch/Dent Notes:</strong>
                        <p className="text-slate-700 text-xs">{selectedJobCard.vehicleCondition.exteriorNotes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSaveInspection} className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="input-label text-xs">Odometer Reading (km):</label>
                        <input
                          type="number"
                          className="login-input text-sm py-1.5"
                          min="0"
                          value={inspectionForm.odometerReading}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, odometerReading: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="input-label text-xs">Fuel Level:</label>
                        <select
                          className="login-input text-sm py-1.5"
                          value={inspectionForm.fuelLevel}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, fuelLevel: e.target.value })}
                        >
                          {FUEL_LEVELS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="input-label text-xs">Estimated Delivery Time:</label>
                        <input
                          type="datetime-local"
                          className="login-input text-sm py-1.5"
                          value={inspectionForm.estimatedDeliveryAt}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, estimatedDeliveryAt: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="input-label text-xs font-semibold">Inventory Checklist:</label>
                      <div className="flex items-center gap-4 text-xs mt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inspectionForm.hasSpareWheel}
                            onChange={(e) => setInspectionForm({ ...inspectionForm, hasSpareWheel: e.target.checked })}
                          />
                          <span>Spare Wheel</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inspectionForm.hasJack}
                            onChange={(e) => setInspectionForm({ ...inspectionForm, hasJack: e.target.checked })}
                          />
                          <span>Jack</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inspectionForm.hasToolKit}
                            onChange={(e) => setInspectionForm({ ...inspectionForm, hasToolKit: e.target.checked })}
                          />
                          <span>Toolkit</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="input-label text-xs">Exterior Notes / Scratches & Dents:</label>
                      <textarea
                        className="login-input text-xs"
                        rows={2}
                        placeholder="Minor scratch on front bumper, left fender dent..."
                        value={inspectionForm.exteriorNotes}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, exteriorNotes: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="input-label text-xs">Inspection Notes:</label>
                      <textarea
                        className="login-input text-xs"
                        rows={2}
                        placeholder="Brake pads worn, coolant level low..."
                        value={inspectionForm.inspectionNotes}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionNotes: e.target.value })}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        className="btn btn-outline-dark btn-sm text-xs"
                        onClick={() => setIsEditingInspection(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm text-xs"
                        disabled={isSavingInspection}
                      >
                        {isSavingInspection ? 'Saving...' : 'Save Inspection Details'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* REQUESTED SERVICES & COMPLAINT */}
              <div className="dossier-card">
                <h4 className="dossier-card-title">
                  <FileText size={16} />
                  <span>Requested Services & Customer Complaint</span>
                </h4>

                {selectedJobCard.customerComplaint && (
                  <div className="problem-box mb-3">
                    <strong>Customer Complaint / Issue Description:</strong>
                    <p className="text-xs mt-1">{selectedJobCard.customerComplaint}</p>
                  </div>
                )}

                <div className="selected-services-list">
                  {(selectedJobCard.requestedServices || []).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No specific catalog services itemized.</p>
                  ) : (
                    selectedJobCard.requestedServices.map((s, idx) => (
                      <div key={idx} className="service-detail-item">
                        <div className="s-header">
                          <strong>{s.name}</strong>
                          <span className="s-price">{s.priceDisplay || (s.price ? `₹${s.price}` : 'Quote on inspection')}</span>
                        </div>
                        {s.category && <span className="category-badge text-[10px] mt-1">{s.category}</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SERVICE ESTIMATES & CUSTOMER APPROVAL WORKFLOW (PHASE 6) */}
              <div className="dossier-card">
                <EstimateManager
                  jobCard={selectedJobCard}
                  isOwner={isOwner}
                  onJobCardUpdated={async () => {
                    if (selectedJobCard?._id) {
                      try {
                        const fresh = await fetchJobCardById(selectedJobCard._id);
                        setSelectedJobCard(fresh);
                      } catch (e) {
                        console.warn('Failed to refresh Job Card:', e.message);
                      }
                    }
                    loadJobCards(pagination.page);
                  }}
                />
              </div>

              {/* FINAL BILLING & INVOICE INTEGRATION (PHASE 7) */}
              <div className="dossier-card border border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="dossier-card-title flex items-center gap-1.5">
                    <Receipt size={16} className="text-amber-400" />
                    <span>Workshop Final Invoice & Billing</span>
                  </h4>
                  {selectedJobCard.invoiceSummary ? (
                    <span className={`status-badge text-[10px] ${
                      selectedJobCard.invoiceSummary.paymentStatus === 'PAID'
                        ? 'badge-payment-paid'
                        : selectedJobCard.invoiceSummary.paymentStatus === 'PARTIALLY_PAID'
                        ? 'badge-payment-partially_paid'
                        : 'badge-payment-unpaid'
                    }`}>
                      {selectedJobCard.invoiceSummary.paymentStatus}
                    </span>
                  ) : null}
                </div>

                {selectedJobCard.invoiceSummary || selectedJobCard.invoiceId ? (
                  <div className="bg-slate-900/90 rounded-md p-3 border border-slate-800 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Invoice #</span>
                        <strong className="text-amber-400 font-mono">
                          {selectedJobCard.invoiceSummary?.invoiceNumber || (typeof selectedJobCard.invoiceId === 'object' ? selectedJobCard.invoiceId.invoiceNumber : 'Generated')}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Total Invoiced</span>
                        <strong className="text-slate-100 font-mono">
                          ₹{(selectedJobCard.invoiceSummary?.grandTotal || (typeof selectedJobCard.invoiceId === 'object' ? selectedJobCard.invoiceId.grandTotal : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Balance Due</span>
                        <strong className={`font-mono ${
                          (selectedJobCard.invoiceSummary?.balanceDue || 0) > 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          ₹{(selectedJobCard.invoiceSummary?.balanceDue ?? (typeof selectedJobCard.invoiceId === 'object' ? selectedJobCard.invoiceId.balanceDue : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                    {onNavigateToBilling && (
                      <div className="pt-2 border-t border-slate-800 flex justify-end">
                        <button
                          type="button"
                          className="btn btn-outline-dark btn-sm text-xs flex items-center gap-1.5"
                          onClick={() => onNavigateToBilling()}
                        >
                          <Receipt size={14} />
                          <span>View in Billing & Invoices Tab</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (['COMPLETED', 'DELIVERED'].includes(selectedJobCard.status)) ? (
                  <div className="bg-amber-950/20 border border-amber-600/30 rounded-md p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-amber-300 font-medium">Job Card completed and ready for billing</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Generate official GST invoice with approved estimate items, labour, and parts.
                      </p>
                    </div>
                    {onNavigateToBilling && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm text-xs whitespace-nowrap flex items-center gap-1.5"
                        onClick={() => onNavigateToBilling()}
                      >
                        <Receipt size={14} />
                        <span>Generate Invoice</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic">
                    Invoicing is unlocked once Job Card is moved to COMPLETED or DELIVERED status (or via Owner Exception in the Billing tab).
                  </p>
                )}
              </div>

              {/* INTERNAL NOTES BOX */}
              <div className="dossier-card">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="dossier-card-title">
                    <Edit3 size={16} />
                    <span>Internal Workshop Staff Notes</span>
                  </h4>
                  {!isEditingNotes && (
                    <button
                      className="btn btn-outline-dark btn-sm text-xs py-0.5 px-2"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      {selectedJobCard.internalNotes ? 'Edit Notes' : '+ Add Notes'}
                    </button>
                  )}
                </div>

                {!isEditingNotes ? (
                  <div className="admin-notes-box text-xs">
                    {selectedJobCard.internalNotes ? (
                      <p>{selectedJobCard.internalNotes}</p>
                    ) : (
                      <p className="text-slate-400 italic">No internal staff notes recorded yet.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      className="login-input text-xs"
                      rows={3}
                      placeholder="Technician instructions, bay allocation, spare parts requisitioned..."
                      value={editInternalNotes}
                      onChange={(e) => setEditInternalNotes(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn btn-outline-dark btn-sm text-xs"
                        onClick={() => setIsEditingNotes(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary btn-sm text-xs"
                        onClick={handleSaveInternalNotes}
                        disabled={isSavingNotes}
                      >
                        {isSavingNotes ? 'Saving...' : 'Save Notes'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* LIFECYCLE AUDIT TRAIL / STATUS TIMELINE */}
              {selectedJobCard.statusTimeline && selectedJobCard.statusTimeline.length > 0 && (
                <div className="dossier-card">
                  <h4 className="dossier-card-title">
                    <Clock size={16} />
                    <span>Workshop Lifecycle State History</span>
                  </h4>
                  <div className="timeline-trail">
                    {selectedJobCard.statusTimeline.map((item, idx) => (
                      <div key={idx} className="timeline-node">
                        <div className="timeline-dot" />
                        <div className="timeline-body">
                          <div className="timeline-headline">
                            <span className="node-status font-bold">{item.status}</span>
                            <span className="node-date">
                              {new Date(item.timestamp).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <span className="node-actor text-xs">
                            Changed by: {item.changedBy?.fullName || 'Staff'} ({item.role || 'Staff'})
                          </span>
                          {item.notes && <p className="node-reason text-xs mt-0.5">Notes: {item.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline-dark" onClick={() => setSelectedJobCard(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STATUS TRANSITION CONFIRMATION MODAL                           */}
      {/* ============================================================== */}
      {statusModalConfig && (
        <div className="admin-modal-backdrop" onClick={() => setStatusModalConfig(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Workshop Status Transition</h3>
              <button className="modal-close-btn" onClick={() => setStatusModalConfig(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmStatusTransition} className="modal-body space-y-3">
              <p className="modal-explainer text-sm">
                Transition Job Card <strong>{statusModalConfig.jobCardNumber}</strong> from{' '}
                <span className="text-amber-600 font-bold">{statusModalConfig.currentStatus}</span> to{' '}
                <span className="text-emerald-600 font-bold">{statusModalConfig.targetStatus}</span>?
              </p>

              {statusError && (
                <div className="admin-alert-banner alert-danger">
                  <AlertCircle size={16} />
                  <span>{statusError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="input-label text-xs">Status Transition Reason / Workshop Notes (Optional):</label>
                <textarea
                  className="login-input text-xs"
                  rows={2}
                  placeholder="e.g. Brake fluid flushed, vehicle ready for quality check bay..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer pt-3">
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
                  {isUpdatingStatus ? 'Advancing...' : `Confirm → ${statusModalConfig.targetStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CREATE JOB CARD MODAL                                          */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="admin-modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Workshop Job Card</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateJobCardSubmit} className="modal-body space-y-4">
              {createError && (
                <div className="admin-alert-banner alert-danger">
                  <AlertCircle size={16} />
                  <span>{createError}</span>
                </div>
              )}

              {/* MODE SELECTOR */}
              <div className="flex border-b border-slate-200 pb-2 gap-4">
                <button
                  type="button"
                  className={`text-sm font-semibold pb-1.5 border-b-2 transition-all ${
                    createMode === 'appointment'
                      ? 'border-amber-500 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => {
                    setCreateMode('appointment');
                    setCreateError('');
                  }}
                >
                  Convert Confirmed Appointment
                </button>
                <button
                  type="button"
                  className={`text-sm font-semibold pb-1.5 border-b-2 transition-all ${
                    createMode === 'walkin'
                      ? 'border-amber-500 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => {
                    setCreateMode('walkin');
                    setCreateError('');
                  }}
                >
                  Direct Walk-In (Customer & Vehicle)
                </button>
              </div>

              {/* MODE 1: FROM CONFIRMED APPOINTMENT */}
              {createMode === 'appointment' && (
                <div className="space-y-3 bg-amber-50/50 p-3 rounded-lg border border-amber-200">
                  <label className="input-label text-xs font-bold text-slate-800">
                    Select Confirmed Appointment:
                  </label>
                  {isLoadingAppts ? (
                    <div className="text-xs text-slate-500 py-2">Loading confirmed appointments...</div>
                  ) : confirmedAppointments.length === 0 ? (
                    <div className="text-xs text-amber-800 p-2 bg-amber-100 rounded">
                      No confirmed appointments available for conversion. Please confirm an appointment in the Appointments tab first or use Direct Walk-In mode.
                    </div>
                  ) : (
                    <select
                      className="login-input text-sm"
                      value={selectedApptId}
                      onChange={(e) => {
                        const apptId = e.target.value;
                        setSelectedApptId(apptId);
                        const appt = confirmedAppointments.find((a) => a._id === apptId);
                        if (appt) {
                          setNewComplaint(appt.problemDescription || '');
                        }
                      }}
                      required
                    >
                      <option value="">-- Choose Confirmed Appointment --</option>
                      {confirmedAppointments.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.bookingReference} — {a.customerSnapshot?.fullName} ({a.vehicleSnapshot?.brand} {a.vehicleSnapshot?.model} - {a.vehicleSnapshot?.registrationNumber || 'No Plate'}) [
                          {new Date(a.preferredDate).toLocaleDateString('en-IN')}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* MODE 2: DIRECT WALK-IN */}
              {createMode === 'walkin' && (
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="input-label text-xs font-bold text-slate-800">
                      Search & Select Customer:
                    </label>
                    <input
                      type="text"
                      className="login-input text-sm"
                      placeholder="Type customer name or mobile number..."
                      value={customerSearch}
                      onChange={(e) => handleSearchCustomers(e.target.value)}
                    />
                    {isSearchingCustomers && (
                      <span className="text-[11px] text-slate-400 block mt-1">Searching customers...</span>
                    )}
                    {customersList.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded shadow-md mt-1 max-h-40 overflow-y-auto">
                        {customersList.map((cust) => (
                          <div
                            key={cust._id}
                            className="p-2 hover:bg-amber-50 cursor-pointer text-xs border-b last:border-0"
                            onClick={() => handleSelectCustomer(cust)}
                          >
                            <strong>{cust.fullName}</strong> — {cust.mobileNumber} ({cust.city})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedCustomer && (
                    <div>
                      <label className="input-label text-xs font-bold text-slate-800">
                        Select Customer Vehicle:
                      </label>
                      {customerVehicles.length === 0 ? (
                        <p className="text-xs text-red-600">No vehicles registered for this customer.</p>
                      ) : (
                        <select
                          className="login-input text-sm"
                          value={selectedVehicleId}
                          onChange={(e) => setSelectedVehicleId(e.target.value)}
                          required
                        >
                          {customerVehicles.map((v) => (
                            <option key={v._id} value={v._id}>
                              {v.brand} {v.model} — {v.registrationNumberDisplay || v.registrationNumberClean || 'Provisional (No Plate)'} ({v.fuelType})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* INTAKE INSPECTION FIELDS */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Initial Intake Inspection Details
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="input-label text-xs">Odometer Reading (km):</label>
                    <input
                      type="number"
                      className="login-input text-sm"
                      min="0"
                      value={newOdometer}
                      onChange={(e) => setNewOdometer(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="input-label text-xs">Fuel Level:</label>
                    <select
                      className="login-input text-sm"
                      value={newFuelLevel}
                      onChange={(e) => setNewFuelLevel(e.target.value)}
                    >
                      {FUEL_LEVELS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="input-label text-xs">Est. Delivery Date:</label>
                    <input
                      type="datetime-local"
                      className="login-input text-sm"
                      value={newEstimatedDelivery}
                      onChange={(e) => setNewEstimatedDelivery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="input-label text-xs">Customer Complaint / Requested Work:</label>
                  <textarea
                    className="login-input text-xs"
                    rows={2}
                    placeholder="Describe specific symptoms or work items requested..."
                    value={newComplaint}
                    onChange={(e) => setNewComplaint(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="input-label text-xs font-semibold">Inventory Checklist:</label>
                  <div className="flex items-center gap-4 text-xs mt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCondition.hasSpareWheel}
                        onChange={(e) => setNewCondition({ ...newCondition, hasSpareWheel: e.target.checked })}
                      />
                      <span>Spare Wheel</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCondition.hasJack}
                        onChange={(e) => setNewCondition({ ...newCondition, hasJack: e.target.checked })}
                      />
                      <span>Jack</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCondition.hasToolKit}
                        onChange={(e) => setNewCondition({ ...newCondition, hasToolKit: e.target.checked })}
                      />
                      <span>Toolkit</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="input-label text-xs">Initial Inspection / Scratch & Dent Notes:</label>
                  <input
                    type="text"
                    className="login-input text-xs"
                    placeholder="e.g. Scratches on left door, dent on tailgate"
                    value={newCondition.exteriorNotes}
                    onChange={(e) => setNewCondition({ ...newCondition, exteriorNotes: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="input-label text-xs">Internal Notes (Tech Only):</label>
                  <input
                    type="text"
                    className="login-input text-xs"
                    placeholder="Allocated to Bay 1, mechanic Ram..."
                    value={newInternalNotes}
                    onChange={(e) => setNewInternalNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer pt-3">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmittingCreate}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingCreate}
                >
                  {isSubmittingCreate ? 'Generating Job Card...' : 'Create Workshop Job Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
