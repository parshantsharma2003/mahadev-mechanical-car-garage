import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Wrench,
  Star,
  Image as ImageIcon,
  Settings,
  LogOut,
  ExternalLink,
  Users,
  Shield,
  HelpCircle,
  Car,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Receipt,
  DollarSign,
  Truck,
  BarChart3
} from 'lucide-react';
import { useGarage } from '../../context/GarageContext';
import OverviewTab from './OverviewTab';
import AppointmentsTab from './AppointmentsTab';
import JobCardsTab from './JobCardsTab';
import BillingTab from './BillingTab';
import ExpensesTab from './ExpensesTab';
import SuppliersTab from './SuppliersTab';
import AnalyticsTab from './AnalyticsTab';
import EnquiriesTab from './EnquiriesTab';
import CustomersTab from './CustomersTab';
import VehiclesTab from './VehiclesTab';
import ServicesTab from './ServicesTab';
import GalleryTab from './GalleryTab';
import ReviewsTab from './ReviewsTab';
import UsersTab from './UsersTab';
import SettingsTab from './SettingsTab';
import AuditTab from './AuditTab';
import './AdminDashboard.css';

export default function AdminDashboard({ onBackToSite }) {
  const { adminUser, adminRole, isOwner, adminLogout } = useGarage();

  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Cross-tab state sharing
  const [initialAppointmentStatus, setInitialAppointmentStatus] = useState('ALL');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [preselectedAppointmentIdForJobCard, setPreselectedAppointmentIdForJobCard] = useState(null);

  // Esc key closes mobile menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleNavigate = (tabName, extra = {}) => {
    if (extra.status) {
      setInitialAppointmentStatus(extra.status);
    } else {
      setInitialAppointmentStatus('ALL');
    }
    setActiveTab(tabName);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAppointment = (id) => {
    setSelectedAppointmentId(id);
    setActiveTab('appointments');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabTitles = {
    overview: {
      title: 'Workshop Operations Dashboard',
      subtitle: 'Real-time booking schedule, workshop metrics, and operational pipeline'
    },
    appointments: {
      title: 'Appointment Management',
      subtitle: 'Review incoming customer requests, schedule bay times, and track job progress'
    },
    'job-cards': {
      title: 'Workshop Job Cards & Floor Operations',
      subtitle: 'Service intake, technician inspection, live workflow stage gating, and completion records'
    },
    billing: {
      title: 'Billing, Invoices & Customer Khatta',
      subtitle: 'Final invoices, payment collections, customer ledger accounts, and revenue tracking'
    },
    expenses: {
      title: 'Workshop Expense Management',
      subtitle: 'Record daily workshop overheads, utilities, salaries, and printable A4 payment vouchers'
    },
    suppliers: {
      title: 'Suppliers, Purchases & Digital Supplier Khatta',
      subtitle: 'Manage spare parts vendors, material purchases, disbursements, and supplier ledger accounts'
    },
    analytics: {
      title: 'Business Analytics & Financial Reporting',
      subtitle: 'Real-time revenue, collections, operating expenses, supplier payables, and garage performance metrics'
    },
    enquiries: {
      title: 'Customer Enquiries & WhatsApp Leads',
      subtitle: 'Customer questions submitted via website with direct WhatsApp response'
    },
    customers: {
      title: 'Customer Directory & Booking Dossiers',
      subtitle: 'Verified customer records, phone numbers, visit history, and technician notes'
    },
    vehicles: {
      title: 'Vehicle Fleet & Registration Registry',
      subtitle: 'Unique vehicle identification plates, conflict warnings, and provisional units'
    },
    services: {
      title: 'Workshop Service Catalog',
      subtitle: 'Configure public services, pricing estimates, procedure durations, and tags'
    },
    gallery: {
      title: 'Work Gallery & Machinery Showcase',
      subtitle: 'Manage before/after photos, equipment videos, and carousel showcases'
    },
    reviews: {
      title: 'Customer Reviews & Testimonials',
      subtitle: 'Verified customer ratings, feedback, and website testimonial toggles'
    },
    users: {
      title: 'SUPER_ADMIN Staff Management (Owner Only)',
      subtitle: 'Provision, activate, deactivate, and reset passwords for operational staff'
    },
    settings: {
      title: 'Garage Profile & Operational Policy',
      subtitle: 'Official workshop details, Sunday appointment policy, and social links'
    },
    audit: {
      title: 'Immutable Security Audit Trail (Owner Only)',
      subtitle: 'Cryptographically protected, append-only administrative event log'
    }
  };

  const currentTabMeta = tabTitles[activeTab] || tabTitles.overview;

  return (
    <div className={`admin-dashboard-layout ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast-banner" role="status">
          <CheckCircle2 size={18} className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="admin-mobile-overlay" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ==================== SIDEBAR ==================== */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed ? (
            <div className="sidebar-brand-box">
              <img src="/images/logo.png" alt="Mahadev Garage" className="sidebar-logo-img" />
              <div className="brand-text-block">
                <span className="brand-primary-name">MAHADEV</span>
                <span className="brand-tagline-name">GARAGE CONTROL</span>
              </div>
            </div>
          ) : (
            <div className="sidebar-logo-collapsed" title="Mahadev Garage">
              <span className="collapsed-m-badge">M</span>
            </div>
          )}

          <button 
            className="sidebar-close-btn" 
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            className="sidebar-collapse-toggle desktop-only"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label="Toggle Sidebar Width"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Current User Role Pill */}
        {!sidebarCollapsed && adminUser && (
          <div className="sidebar-user-block">
            <div className="user-avatar-circle">
              {adminUser.fullName ? adminUser.fullName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="user-details-text">
              <span className="user-name-text">{adminUser.fullName || 'Admin User'}</span>
              <span className={`user-role-badge ${isOwner ? 'role-badge-owner' : 'role-badge-super'}`}>
                {adminRole}
              </span>
            </div>
          </div>
        )}

        {/* Nav Tabs */}
        <nav className="sidebar-nav">
          <button
            className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
            title="Dashboard Overview"
          >
            <LayoutDashboard size={19} />
            {!sidebarCollapsed && <span>Dashboard Overview</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => { setActiveTab('appointments'); setMobileMenuOpen(false); }}
            title="Appointments Registry"
          >
            <Calendar size={19} />
            {!sidebarCollapsed && <span>Appointments</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'job-cards' ? 'active' : ''}`}
            onClick={() => { setActiveTab('job-cards'); setMobileMenuOpen(false); }}
            title="Workshop Job Cards"
          >
            <ClipboardList size={19} />
            {!sidebarCollapsed && <span>Job Cards</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => { setActiveTab('billing'); setMobileMenuOpen(false); }}
            title="Billing & Customer Khatta"
          >
            <Receipt size={19} />
            {!sidebarCollapsed && <span>Billing & Invoices</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => { setActiveTab('expenses'); setMobileMenuOpen(false); }}
            title="Workshop Expenses"
          >
            <DollarSign size={19} />
            {!sidebarCollapsed && <span>Expenses</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
            onClick={() => { setActiveTab('suppliers'); setMobileMenuOpen(false); }}
            title="Suppliers & Purchases"
          >
            <Truck size={19} />
            {!sidebarCollapsed && <span>Suppliers & Khatta</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }}
            title="Business Analytics & Financials"
          >
            <BarChart3 size={19} />
            {!sidebarCollapsed && <span>Business Analytics</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'enquiries' ? 'active' : ''}`}
            onClick={() => { setActiveTab('enquiries'); setMobileMenuOpen(false); }}
            title="Customer Enquiries"
          >
            <HelpCircle size={19} />
            {!sidebarCollapsed && <span>Enquiries & Leads</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => { setActiveTab('customers'); setMobileMenuOpen(false); }}
            title="Customer Directory"
          >
            <UserCheck size={19} />
            {!sidebarCollapsed && <span>Customer Registry</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'vehicles' ? 'active' : ''}`}
            onClick={() => { setActiveTab('vehicles'); setMobileMenuOpen(false); }}
            title="Vehicle Registry"
          >
            <Car size={19} />
            {!sidebarCollapsed && <span>Vehicle Fleet</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => { setActiveTab('services'); setMobileMenuOpen(false); }}
            title="Workshop Services"
          >
            <Wrench size={19} />
            {!sidebarCollapsed && <span>Service Catalog</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => { setActiveTab('gallery'); setMobileMenuOpen(false); }}
            title="Work Gallery"
          >
            <ImageIcon size={19} />
            {!sidebarCollapsed && <span>Work Gallery</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => { setActiveTab('reviews'); setMobileMenuOpen(false); }}
            title="Customer Reviews"
          >
            <Star size={19} />
            {!sidebarCollapsed && <span>Customer Reviews</span>}
          </button>

          {/* OWNER-ONLY USER MANAGEMENT */}
          {isOwner && (
            <button
              className={`nav-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
              title="Staff Accounts (Owner Only)"
            >
              <Users size={19} />
              {!sidebarCollapsed && <span>Staff Management</span>}
            </button>
          )}

          <button
            className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
            title="Garage Profile & Settings"
          >
            <Settings size={19} />
            {!sidebarCollapsed && <span>Garage Settings</span>}
          </button>

          {/* OWNER-ONLY AUDIT LOGS */}
          {isOwner && (
            <button
              className={`nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => { setActiveTab('audit'); setMobileMenuOpen(false); }}
              title="Audit Logs (Owner Only)"
            >
              <Shield size={19} />
              {!sidebarCollapsed && <span>Audit Trail</span>}
            </button>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-link-btn" onClick={onBackToSite} title="Open Live Website">
            <ExternalLink size={16} />
            {!sidebarCollapsed && <span>View Live Website</span>}
          </button>
          <button className="sidebar-logout-btn" onClick={adminLogout} title="Sign Out">
            <LogOut size={16} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="admin-main-wrap">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="admin-menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Mobile Menu"
            >
              <Menu size={22} />
            </button>
            <div className="topbar-title-block">
              <h1 className="topbar-title">{currentTabMeta.title}</h1>
              <p className="topbar-sub">{currentTabMeta.subtitle}</p>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-user-tag">
              <span className="live-status-dot" title="Authenticated session active" />
              <span className="topbar-user-name">
                {adminUser?.fullName || 'Administrator'} ({adminRole})
              </span>
            </div>
            <button className="btn btn-outline-dark btn-sm desktop-only" onClick={onBackToSite}>
              <ExternalLink size={14} />
              <span>Live Website</span>
            </button>
          </div>
        </header>

        {/* Active Tab View */}
        <main className="admin-main-body">
          {activeTab === 'overview' && (
            <OverviewTab
              isOwner={isOwner}
              onNavigate={handleNavigate}
              onSelectAppointment={handleSelectAppointment}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsTab
              initialStatus={initialAppointmentStatus}
              selectedAppointmentId={selectedAppointmentId}
              onClearSelectedId={() => setSelectedAppointmentId(null)}
              onConvertToJobCard={(apptId) => {
                setPreselectedAppointmentIdForJobCard(apptId);
                setActiveTab('job-cards');
              }}
            />
          )}

          {activeTab === 'job-cards' && (
            <JobCardsTab
              preselectedAppointmentId={preselectedAppointmentIdForJobCard}
              onClearPreselected={() => setPreselectedAppointmentIdForJobCard(null)}
              onNavigateToBilling={() => setActiveTab('billing')}
              isOwner={isOwner}
            />
          )}

          {activeTab === 'billing' && (
            <BillingTab
              isOwner={isOwner}
              onNavigateToJobCards={() => setActiveTab('job-cards')}
              onNavigateToCustomers={() => setActiveTab('customers')}
            />
          )}

          {activeTab === 'expenses' && <ExpensesTab isOwner={isOwner} />}

          {activeTab === 'suppliers' && <SuppliersTab isOwner={isOwner} />}

          {activeTab === 'analytics' && <AnalyticsTab isOwner={isOwner} />}

          {activeTab === 'enquiries' && <EnquiriesTab />}

          {activeTab === 'customers' && <CustomersTab isOwner={isOwner} />}

          {activeTab === 'vehicles' && <VehiclesTab />}

          {activeTab === 'services' && <ServicesTab />}

          {activeTab === 'gallery' && <GalleryTab />}

          {activeTab === 'reviews' && <ReviewsTab />}

          {activeTab === 'users' && (
            isOwner ? (
              <UsersTab isOwner={isOwner} />
            ) : (
              <div className="admin-content-card empty-card">
                <AlertCircle size={40} className="empty-icon text-red-500" />
                <h4 className="empty-title">Access Denied (403 Forbidden)</h4>
                <p className="empty-sub">Staff account management is strictly restricted to the OWNER role.</p>
              </div>
            )
          )}

          {activeTab === 'settings' && <SettingsTab />}

          {activeTab === 'audit' && (
            isOwner ? (
              <AuditTab isOwner={isOwner} />
            ) : (
              <div className="admin-content-card empty-card">
                <AlertCircle size={40} className="empty-icon text-red-500" />
                <h4 className="empty-title">Access Denied (403 Forbidden)</h4>
                <p className="empty-sub">System audit trails are immutable and strictly restricted to the OWNER role.</p>
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}
