import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  CheckCircle2,
  Phone,
  Car,
  User,
  Wrench,
  Shield,
  Activity,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { fetchDashboardStats } from '../../utils/api';

export default function OverviewTab({ isOwner, onNavigate, onSelectAppointment }) {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load operational stats.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="tab-loading-state">
        <div className="loading-spinner" />
        <p>Loading workshop operational indicators...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-error-state">
        <AlertCircle size={24} className="text-red-500" />
        <p>{error}</p>
        <button className="btn btn-outline-dark" onClick={loadStats}>
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const kpi = stats?.kpi || {
    totalBookingsThisWeek: 0,
    pendingBookingsCount: 0,
    confirmedTodayCount: 0,
    unresolvedEnquiriesCount: 0
  };

  const statusDist = stats?.statusDistribution || {};
  const todayAppts = stats?.todayAppointments || [];
  const recentBookings = stats?.recentBookings || [];
  const recentEnquiries = stats?.recentEnquiries || [];
  const recentActivity = stats?.recentActivity || [];

  return (
    <div className="overview-tab-content">
      {/* Top Banner with Refresh */}
      <div className="overview-header-bar">
        <div>
          <h2 className="overview-headline">Workshop Operations Overview</h2>
          <p className="overview-subtitle">
            Live operational metrics and service scheduling for Mahadev Mechanical Car Garage
          </p>
        </div>
        <button className="btn btn-outline-dark btn-sm" onClick={loadStats} title="Refresh Live Data">
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 4 OPERATIONAL KPIS (Real Data Only - No Mock Revenue) */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => onNavigate('appointments')}>
          <div className="kpi-icon-wrap icon-blue">
            <Calendar size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-number">{kpi.totalBookingsThisWeek}</span>
            <span className="kpi-label">Bookings This Week</span>
            <span className="kpi-subtext">Active operational schedule</span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('appointments', { status: 'PENDING' })}>
          <div className="kpi-icon-wrap icon-red">
            <Clock size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-number">{kpi.pendingBookingsCount}</span>
            <span className="kpi-label">Pending Requests</span>
            <span className="kpi-subtext">Require availability confirmation</span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('appointments')}>
          <div className="kpi-icon-wrap icon-gold">
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-number">{kpi.confirmedTodayCount}</span>
            <span className="kpi-label">Confirmed Today</span>
            <span className="kpi-subtext">Scheduled for service bays today</span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('enquiries')}>
          <div className="kpi-icon-wrap icon-green">
            <HelpCircle size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-number">{kpi.unresolvedEnquiriesCount}</span>
            <span className="kpi-label">Unresolved Enquiries</span>
            <span className="kpi-subtext">Customer queries awaiting contact</span>
          </div>
        </div>
      </div>

      {/* BOOKING STATUS DISTRIBUTION */}
      <div className="admin-content-card">
        <div className="card-header-flex">
          <div>
            <h3 className="section-card-title">Appointment Status Distribution</h3>
            <p className="section-card-sub">Active workflow distribution across all bookings</p>
          </div>
        </div>
        <div className="status-dist-pills">
          <div className="status-pill status-pending" onClick={() => onNavigate('appointments', { status: 'PENDING' })}>
            <span className="pill-dot" />
            <span className="pill-label">Pending:</span>
            <span className="pill-count">{statusDist.PENDING || 0}</span>
          </div>
          <div className="status-pill status-confirmed" onClick={() => onNavigate('appointments', { status: 'CONFIRMED' })}>
            <span className="pill-dot" />
            <span className="pill-label">Confirmed:</span>
            <span className="pill-count">{statusDist.CONFIRMED || 0}</span>
          </div>
          <div className="status-pill status-progress" onClick={() => onNavigate('appointments', { status: 'IN_PROGRESS' })}>
            <span className="pill-dot" />
            <span className="pill-label">In Progress:</span>
            <span className="pill-count">{statusDist.IN_PROGRESS || 0}</span>
          </div>
          <div className="status-pill status-completed" onClick={() => onNavigate('appointments', { status: 'COMPLETED' })}>
            <span className="pill-dot" />
            <span className="pill-label">Completed:</span>
            <span className="pill-count">{statusDist.COMPLETED || 0}</span>
          </div>
          <div className="status-pill status-cancelled" onClick={() => onNavigate('appointments', { status: 'CANCELLED' })}>
            <span className="pill-dot" />
            <span className="pill-label">Cancelled:</span>
            <span className="pill-count">{statusDist.CANCELLED || 0}</span>
          </div>
          <div className="status-pill status-rejected" onClick={() => onNavigate('appointments', { status: 'REJECTED' })}>
            <span className="pill-dot" />
            <span className="pill-label">Rejected:</span>
            <span className="pill-count">{statusDist.REJECTED || 0}</span>
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: TODAY'S APPOINTMENTS & RECENT ENQUIRIES */}
      <div className="overview-two-col">
        {/* Today's Appointments */}
        <div className="admin-content-card">
          <div className="card-header-flex">
            <div>
              <h3 className="section-card-title">Today's Scheduled Appointments</h3>
              <p className="section-card-sub">Vehicles scheduled for workshop service today</p>
            </div>
            <button className="btn-text-link" onClick={() => onNavigate('appointments')}>
              <span>View All</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {todayAppts.length === 0 ? (
            <div className="empty-state-box">
              <Calendar size={28} className="empty-icon" />
              <p className="empty-text">No appointments scheduled for today yet.</p>
            </div>
          ) : (
            <div className="overview-list">
              {todayAppts.map((appt) => (
                <div key={appt._id} className="overview-list-item" onClick={() => onSelectAppointment(appt._id)}>
                  <div className="item-meta">
                    <span className="item-title">
                      {appt.customerSnapshot?.fullName || appt.customerId?.fullName || 'Customer'}
                    </span>
                    <span className="item-sub">
                      <Car size={13} />
                      {appt.vehicleSnapshot?.brand} {appt.vehicleSnapshot?.model} •{' '}
                      {appt.vehicleSnapshot?.registrationNumber || 'No Plate'}
                    </span>
                    <span className="item-slot">{appt.preferredTimeSlot}</span>
                  </div>
                  <div className="item-right">
                    <span className={`status-badge-inline badge-${(appt.status || 'PENDING').toLowerCase()}`}>
                      {appt.status}
                    </span>
                    <ArrowRight size={14} className="item-arrow" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Enquiries */}
        <div className="admin-content-card">
          <div className="card-header-flex">
            <div>
              <h3 className="section-card-title">Recent Customer Enquiries</h3>
              <p className="section-card-sub">Latest customer questions submitted from website</p>
            </div>
            <button className="btn-text-link" onClick={() => onNavigate('enquiries')}>
              <span>View All</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {recentEnquiries.length === 0 ? (
            <div className="empty-state-box">
              <HelpCircle size={28} className="empty-icon" />
              <p className="empty-text">No new customer enquiries.</p>
            </div>
          ) : (
            <div className="overview-list">
              {recentEnquiries.map((enq) => (
                <div key={enq._id} className="overview-list-item" onClick={() => onNavigate('enquiries')}>
                  <div className="item-meta">
                    <span className="item-title">{enq.customerName}</span>
                    <span className="item-sub">
                      <Phone size={13} />
                      {enq.mobileNumber}
                    </span>
                    <p className="enquiry-snippet">{enq.message}</p>
                  </div>
                  <div className="item-right">
                    <span className={`status-badge-inline badge-${(enq.status || 'NEW').toLowerCase()}`}>
                      {enq.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS & LIVE AUDIT TRAIL */}
      <div className="overview-two-col">
        {/* Quick Actions */}
        <div className="admin-content-card">
          <h3 className="section-card-title">Operational Quick Actions</h3>
          <p className="section-card-sub">Frequently accessed workshop controls</p>
          <div className="quick-actions-btns">
            <button className="btn btn-outline-dark" onClick={() => onNavigate('appointments')}>
              <Calendar size={16} />
              <span>Manage Appointments</span>
            </button>
            <button className="btn btn-outline-dark" onClick={() => onNavigate('customers')}>
              <User size={16} />
              <span>Customer Registry</span>
            </button>
            <button className="btn btn-outline-dark" onClick={() => onNavigate('vehicles')}>
              <Car size={16} />
              <span>Vehicle Fleet</span>
            </button>
            <button className="btn btn-outline-dark" onClick={() => onNavigate('services')}>
              <Wrench size={16} />
              <span>Service Catalog</span>
            </button>
            <button className="btn btn-outline-dark" onClick={() => onNavigate('settings')}>
              <span>Garage Settings</span>
            </button>
          </div>
        </div>

        {/* Recent Operational Activity (Live for OWNER, or overview for SUPER_ADMIN) */}
        {isOwner && (
          <div className="admin-content-card">
            <div className="card-header-flex">
              <div>
                <h3 className="section-card-title">Live Audit Trail (Owner Only)</h3>
                <p className="section-card-sub">Recent system operations and state changes</p>
              </div>
              <button className="btn-text-link" onClick={() => onNavigate('audit')}>
                <span>View Full Log</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {recentActivity.length === 0 ? (
              <div className="empty-state-box">
                <Activity size={24} className="empty-icon" />
                <p className="empty-text">No recent audit activity recorded.</p>
              </div>
            ) : (
              <div className="activity-mini-list">
                {recentActivity.slice(0, 5).map((log) => (
                  <div key={log._id} className="activity-mini-item">
                    <div className="activity-icon-badge">
                      <Shield size={13} />
                    </div>
                    <div className="activity-details">
                      <div className="activity-title-line">
                        <span className="activity-action">{log.action}</span>
                        <span className="activity-time">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="activity-meta">
                        by {log.actorName} ({log.actorRole}) • {log.entityType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
