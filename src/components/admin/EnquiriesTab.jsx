import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Phone,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { fetchEnquiries, fetchEnquiryById, updateEnquiryStatus } from '../../utils/api';

const VALID_ENQUIRY_TRANSITIONS = {
  NEW: ['PENDING', 'CONTACTED', 'RESOLVED'],
  PENDING: ['CONTACTED', 'RESOLVED'],
  CONTACTED: ['RESOLVED'],
  RESOLVED: []
};

export default function EnquiriesTab() {
  const [enquiries, setEnquiries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Details Modal
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Status Change Modal
  const [statusModalConfig, setStatusModalConfig] = useState(null); // { id, ticketNumber, currentStatus, targetStatus }
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadEnquiries = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchEnquiries({
        page,
        limit: 15,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined
      });
      setEnquiries(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load customer enquiries.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadEnquiries(1);
  }, [loadEnquiries]);

  const handleOpenDetails = async (id) => {
    setIsLoadingDetails(true);
    try {
      const enq = await fetchEnquiryById(id);
      setSelectedEnquiry(enq);
    } catch (err) {
      alert('Failed to load enquiry details: ' + err.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleInitiateStatusChange = (enq, targetStatus) => {
    setActionError('');
    setResolutionNotes(enq.resolutionNotes || '');
    setStatusModalConfig({
      id: enq._id,
      ticketNumber: enq.ticketNumber,
      currentStatus: enq.status,
      targetStatus
    });
  };

  const handleConfirmStatusChange = async (e) => {
    e.preventDefault();
    if (!statusModalConfig) return;

    setIsUpdating(true);
    setActionError('');
    try {
      await updateEnquiryStatus(statusModalConfig.id, {
        status: statusModalConfig.targetStatus,
        resolutionNotes: resolutionNotes.trim() || undefined
      });

      if (selectedEnquiry && selectedEnquiry._id === statusModalConfig.id) {
        const updated = await fetchEnquiryById(statusModalConfig.id);
        setSelectedEnquiry(updated);
      }

      setStatusModalConfig(null);
      loadEnquiries(pagination.page);
    } catch (err) {
      setActionError(err.message || 'Failed to update enquiry status.');
    } finally {
      setIsUpdating(false);
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
            placeholder="Search by ticket number, customer name, mobile, or subject..."
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
              <option value="NEW">New</option>
              <option value="PENDING">Pending</option>
              <option value="CONTACTED">Contacted</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <button className="btn btn-outline-dark btn-sm" onClick={() => loadEnquiries(pagination.page)}>
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

      {/* Content */}
      {isLoading ? (
        <div className="tab-loading-state">
          <div className="loading-spinner" />
          <p>Loading enquiries ticket queue...</p>
        </div>
      ) : enquiries.length === 0 ? (
        <div className="admin-content-card empty-card">
          <HelpCircle size={36} className="empty-icon" />
          <h4 className="empty-title">No customer enquiries found</h4>
          <p className="empty-sub">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your search criteria or status filter.'
              : 'Customer queries will appear here when submitted from the website.'}
          </p>
        </div>
      ) : (
        <div className="admin-content-card no-padding">
          <div className="table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Customer</th>
                  <th>Subject</th>
                  <th>Message Snippet</th>
                  <th>Contact Method</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enq) => {
                  const allowedNext = VALID_ENQUIRY_TRANSITIONS[enq.status] || [];
                  const isTerminal = allowedNext.length === 0;

                  return (
                    <tr key={enq._id}>
                      <td>
                        <span className="booking-ref-badge">{enq.ticketNumber}</span>
                        <span className="text-xs text-muted block mt-1">
                          {new Date(enq.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short'
                          })}
                        </span>
                      </td>
                      <td>
                        <div className="cust-cell">
                          <span className="cust-name">{enq.customerName}</span>
                          <span className="cust-phone">
                            <Phone size={12} />
                            {enq.mobileNumber}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="enquiry-subject-text">{enq.subject || 'General Inquiry'}</span>
                      </td>
                      <td>
                        <p className="enquiry-table-msg">{enq.message}</p>
                      </td>
                      <td>
                        <span className="contact-method-badge">
                          {enq.preferredContactMethod || 'PHONE'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge badge-${(enq.status || 'NEW').toLowerCase()}`}>
                          {enq.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-wrap">
                          <button
                            className="btn-action-icon"
                            onClick={() => handleOpenDetails(enq._id)}
                            title="View Full Ticket"
                          >
                            <Eye size={16} />
                          </button>

                          {/* Quick WhatsApp / Call Link */}
                          <a
                            href={`https://wa.me/91${enq.mobileNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${enq.customerName}, this is Mahadev Mechanical Car Garage regarding your enquiry #${enq.ticketNumber}.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-action-icon text-emerald-500"
                            title="Message on WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </a>

                          {/* Transition Actions */}
                          {!isTerminal && (
                            <div className="status-quick-actions">
                              {allowedNext.includes('CONTACTED') && (
                                <button
                                  className="btn-status-action btn-status-confirm"
                                  onClick={() => handleInitiateStatusChange(enq, 'CONTACTED')}
                                  title="Mark as Contacted"
                                >
                                  Contacted
                                </button>
                              )}
                              {allowedNext.includes('RESOLVED') && (
                                <button
                                  className="btn-status-action btn-status-complete"
                                  onClick={() => handleInitiateStatusChange(enq, 'RESOLVED')}
                                  title="Mark as Resolved"
                                >
                                  Resolve
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="table-pagination-bar">
              <span className="pagination-info">
                Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total enquiries)
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn-pagination"
                  disabled={pagination.page <= 1}
                  onClick={() => loadEnquiries(pagination.page - 1)}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  className="btn-pagination"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadEnquiries(pagination.page + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ENQUIRY DETAILS MODAL */}
      {selectedEnquiry && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedEnquiry(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Enquiry Ticket #{selectedEnquiry.ticketNumber}</h3>
                <span className={`status-badge badge-${(selectedEnquiry.status || 'NEW').toLowerCase()}`}>
                  {selectedEnquiry.status}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedEnquiry(null)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="dossier-data-list">
                <div className="dossier-row">
                  <span className="dossier-k">Customer:</span>
                  <span className="dossier-v font-semibold">{selectedEnquiry.customerName}</span>
                </div>
                <div className="dossier-row">
                  <span className="dossier-k">Mobile:</span>
                  <span className="dossier-v flex items-center gap-2">
                    <a href={`tel:${selectedEnquiry.mobileNumber}`} className="text-blue-500 underline">
                      {selectedEnquiry.mobileNumber}
                    </a>
                  </span>
                </div>
                <div className="dossier-row">
                  <span className="dossier-k">Preferred Method:</span>
                  <span className="dossier-v">{selectedEnquiry.preferredContactMethod || 'Phone Call'}</span>
                </div>
                <div className="dossier-row">
                  <span className="dossier-k">Submitted At:</span>
                  <span className="dossier-v">{new Date(selectedEnquiry.createdAt).toLocaleString('en-IN')}</span>
                </div>
                {selectedEnquiry.contactedAt && (
                  <div className="dossier-row">
                    <span className="dossier-k">Contacted At:</span>
                    <span className="dossier-v">{new Date(selectedEnquiry.contactedAt).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {selectedEnquiry.resolvedAt && (
                  <div className="dossier-row">
                    <span className="dossier-k">Resolved At:</span>
                    <span className="dossier-v">{new Date(selectedEnquiry.resolvedAt).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div className="problem-box mt-3">
                <strong>Subject:</strong>
                <p className="font-semibold text-slate-800">{selectedEnquiry.subject || 'General Inquiry'}</p>
                <strong className="mt-2 block">Customer Message:</strong>
                <p className="mt-1">{selectedEnquiry.message}</p>
              </div>

              {selectedEnquiry.resolutionNotes && (
                <div className="admin-notes-box mt-3">
                  <strong>Resolution Notes / Staff Remarks:</strong>
                  <p>{selectedEnquiry.resolutionNotes}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <a
                href={`https://wa.me/91${selectedEnquiry.mobileNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${selectedEnquiry.customerName}, this is Mahadev Mechanical Car Garage regarding your enquiry #${selectedEnquiry.ticketNumber}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-dark"
              >
                <MessageCircle size={16} />
                <span>WhatsApp Customer</span>
              </a>
              <button className="btn btn-primary" onClick={() => setSelectedEnquiry(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS TRANSITION MODAL */}
      {statusModalConfig && (
        <div className="admin-modal-backdrop" onClick={() => setStatusModalConfig(null)}>
          <div className="admin-modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Transition Enquiry Status</h3>
              <button className="modal-close-btn" onClick={() => setStatusModalConfig(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmStatusChange} className="modal-body">
              <p className="modal-explainer">
                Transition ticket <strong>#{statusModalConfig.ticketNumber}</strong> from{' '}
                <span className="text-amber-500 font-semibold">{statusModalConfig.currentStatus}</span> to{' '}
                <span className="text-emerald-500 font-semibold">{statusModalConfig.targetStatus}</span>?
              </p>

              {actionError && (
                <div className="admin-alert-banner alert-danger">
                  <AlertCircle size={16} />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="input-label">
                  <span>Resolution Notes / Remarks:</span>
                </label>
                <textarea
                  className="login-input"
                  rows={3}
                  placeholder="Record summary of customer call, quote provided, or resolution details..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => setStatusModalConfig(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : `Set as ${statusModalConfig.targetStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
