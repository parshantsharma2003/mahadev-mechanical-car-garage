import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Wrench,
  Star,
  Image as ImageIcon,
  Settings,
  Database,
  LogOut,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  Car,
  AlertTriangle,
  X,
  Save,
  RotateCcw,
  Download,
  Upload,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Menu,
  MoreHorizontal
} from 'lucide-react';
import { useGarage } from '../../context/GarageContext';
import './AdminDashboard.css';

export default function AdminDashboard({ onBackToSite }) {
  const {
    data,
    bookings,
    adminLogout,
    // Services
    addService,
    updateService,
    deleteService,
    // Gallery
    addGalleryItem,
    updateGalleryItem,
    deleteGalleryItem,
    // Reviews
    addReview,
    updateReview,
    deleteReview,
    // Bookings
    addBooking,
    updateBooking,
    updateBookingStatus,
    deleteBooking,
    // Settings
    updateBusiness,
    updateContact,
    resetToDefaults,
    exportDataBackup,
    importDataBackup
  } = useGarage();

  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Laptop-first compact sidebar
  const [toastMessage, setToastMessage] = useState('');

  // Search & Filter States
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingFilterStatus, setBookingFilterStatus] = useState('ALL');
  const [serviceSearch, setServiceSearch] = useState('');

  // Modal States
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [editingGalleryItem, setEditingGalleryItem] = useState(null);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  // Settings Form State
  const [businessForm, setBusinessForm] = useState({ ...data.business });
  const [contactForm, setContactForm] = useState({ ...data.contact });

  // Keyboard shortcut: Esc closes any open modal or drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsServiceModalOpen(false);
        setIsReviewModalOpen(false);
        setIsGalleryModalOpen(false);
        setIsBookingModalOpen(false);
        setDeleteConfirmTarget(null);
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

  // ---------------- MODAL OPENERS ----------------
  const handleOpenNewService = () => {
    setEditingService({
      id: '',
      title: '',
      shortDesc: '',
      fullDesc: '',
      image: '/images/periodic-service.jpg',
      tag: 'Regular Service',
      highlights: ['OEM Parts', 'Safety Check', 'Fluid Inspection']
    });
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (svc) => {
    setEditingService({ ...svc });
    setIsServiceModalOpen(true);
  };

  const handleSaveService = (e) => {
    e.preventDefault();
    if (!editingService.title.trim()) return;

    if (editingService.id && data.services.some(s => s.id === editingService.id)) {
      updateService(editingService.id, editingService);
      showToast(`Updated service "${editingService.title}"`);
    } else {
      addService(editingService);
      showToast(`Added new service "${editingService.title}"`);
    }
    setIsServiceModalOpen(false);
  };

  const handleOpenNewReview = () => {
    setEditingReview({
      id: '',
      author: '',
      vehicle: '',
      service: 'General Car Service',
      rating: 5,
      comment: '',
      date: 'Recent customer',
      verified: true
    });
    setIsReviewModalOpen(true);
  };

  const handleOpenEditReview = (r) => {
    setEditingReview({ ...r });
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = (e) => {
    e.preventDefault();
    if (!editingReview.author.trim() || !editingReview.comment.trim()) return;

    if (editingReview.id && data.reviews.some(r => r.id === editingReview.id)) {
      updateReview(editingReview.id, editingReview);
      showToast(`Updated review from "${editingReview.author}"`);
    } else {
      addReview(editingReview);
      showToast(`Added review from "${editingReview.author}"`);
    }
    setIsReviewModalOpen(false);
  };

  const handleOpenNewGallery = () => {
    setEditingGalleryItem({
      id: '',
      title: '',
      category: 'General',
      image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80',
      description: ''
    });
    setIsGalleryModalOpen(true);
  };

  const handleOpenEditGallery = (item) => {
    setEditingGalleryItem({ ...item });
    setIsGalleryModalOpen(true);
  };

  const handleSaveGallery = (e) => {
    e.preventDefault();
    if (!editingGalleryItem.title.trim()) return;

    if (editingGalleryItem.id && data.gallery.some(g => g.id === editingGalleryItem.id)) {
      updateGalleryItem(editingGalleryItem.id, editingGalleryItem);
      showToast(`Updated gallery item "${editingGalleryItem.title}"`);
    } else {
      addGalleryItem(editingGalleryItem);
      showToast(`Added gallery item "${editingGalleryItem.title}"`);
    }
    setIsGalleryModalOpen(false);
  };

  const handleOpenNewBooking = () => {
    setEditingBooking({
      id: '',
      name: '',
      phone: '',
      brand: 'Maruti Suzuki',
      model: '',
      service: 'General Car Service',
      date: new Date().toISOString().split('T')[0],
      timeSlot: 'Morning (09:00 AM - 12:00 PM)',
      status: 'Confirmed',
      notes: '',
      source: 'Admin Created'
    });
    setIsBookingModalOpen(true);
  };

  const handleOpenEditBooking = (b) => {
    setEditingBooking({ ...b });
    setIsBookingModalOpen(true);
  };

  const handleSaveBooking = (e) => {
    e.preventDefault();
    if (!editingBooking.name.trim() || !editingBooking.phone.trim()) return;

    if (editingBooking.id && bookings.some(b => b.id === editingBooking.id)) {
      updateBooking(editingBooking.id, editingBooking);
      showToast(`Updated booking ${editingBooking.id}`);
    } else {
      const created = addBooking(editingBooking);
      showToast(`Created booking ${created.id}`);
    }
    setIsBookingModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteConfirmTarget) return;
    const { type, id, name } = deleteConfirmTarget;

    if (type === 'service') {
      deleteService(id);
      showToast(`Deleted service "${name}"`);
    } else if (type === 'review') {
      deleteReview(id);
      showToast(`Deleted review from "${name}"`);
    } else if (type === 'gallery') {
      deleteGalleryItem(id);
      showToast(`Deleted gallery item "${name}"`);
    } else if (type === 'booking') {
      deleteBooking(id);
      showToast(`Deleted booking ${id}`);
    }
    setDeleteConfirmTarget(null);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateBusiness(businessForm);
    updateContact(contactForm);
    showToast('Garage profile and contact settings saved!');
  };

  const handleResetFactory = () => {
    if (window.confirm('Are you sure you want to restore all website content to original factory defaults? This will erase all custom services, gallery items, and bookings.')) {
      resetToDefaults();
      setBusinessForm({ ...data.business });
      setContactForm({ ...data.contact });
      showToast('All data has been reset to factory defaults.');
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = importDataBackup(event.target.result);
      if (res.success) {
        showToast('Backup restored successfully!');
      } else {
        alert('Failed to import backup: ' + res.error);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered Bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      (b.name || '').toLowerCase().includes(bookingSearch.toLowerCase()) ||
      (b.phone || '').includes(bookingSearch) ||
      (b.model || '').toLowerCase().includes(bookingSearch.toLowerCase()) ||
      (b.id || '').toLowerCase().includes(bookingSearch.toLowerCase());

    const matchesStatus =
      bookingFilterStatus === 'ALL' || b.status.toUpperCase() === bookingFilterStatus;

    return matchesSearch && matchesStatus;
  });

  // Filtered Services
  const filteredServices = data.services.filter((s) =>
    (s.title || '').toLowerCase().includes(serviceSearch.toLowerCase()) ||
    (s.tag || '').toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // Status Counts
  const pendingCount = bookings.filter(b => b.status === 'Pending').length;

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

      {/* ==================== SIDEBAR (Laptop-Collapsible & Mobile-Drawer) ==================== */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed && (
            <div className="sidebar-brand-box">
              <img src="/images/logo.png" alt="Mahadev Garage" className="sidebar-logo-img" />
            </div>
          )}
          {sidebarCollapsed && (
            <div className="sidebar-logo-collapsed" title="Mahadev Garage">
              <span className="collapsed-m-badge">M</span>
            </div>
          )}
          {!sidebarCollapsed && <span className="sidebar-tag">CONTROL PANEL</span>}

          <button 
            className="sidebar-close-btn" 
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>

          {/* Laptop-only Collapse Toggle */}
          <button
            className="sidebar-collapse-toggle desktop-only"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand Sidebar (260px)" : "Collapse Sidebar (Compact Laptop Mode)"}
            aria-label="Toggle Sidebar Width"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
            title="Dashboard Overview"
          >
            <LayoutDashboard size={19} />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('bookings'); setMobileMenuOpen(false); }}
            title="Customer Appointments"
          >
            <Calendar size={19} />
            {!sidebarCollapsed && <span>Appointments</span>}
            {pendingCount > 0 && <span className="tab-badge-pending">{pendingCount}</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => { setActiveTab('services'); setMobileMenuOpen(false); }}
            title="Workshop Services"
          >
            <Wrench size={19} />
            {!sidebarCollapsed && <span>Services ({data.services.length})</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => { setActiveTab('reviews'); setMobileMenuOpen(false); }}
            title="Customer Reviews"
          >
            <Star size={19} />
            {!sidebarCollapsed && <span>Customer Reviews</span>}
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
            className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
            title="Garage Profile & Settings"
          >
            <Settings size={19} />
            {!sidebarCollapsed && <span>Garage Profile</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => { setActiveTab('backup'); setMobileMenuOpen(false); }}
            title="Data Backup & Reset"
          >
            <Database size={19} />
            {!sidebarCollapsed && <span>Data Backup</span>}
          </button>
        </nav>

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

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <div className="admin-main-wrap">
        {/* Top Header Bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="admin-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              <Menu size={22} />
            </button>
            <div className="topbar-page-info">
              <h1 className="topbar-title">
                {activeTab === 'overview' && 'Workshop Overview'}
                {activeTab === 'bookings' && 'Customer Appointments & Bay Bookings'}
                {activeTab === 'services' && 'Workshop Services Manager'}
                {activeTab === 'reviews' && 'Customer Testimonials & Ratings'}
                {activeTab === 'gallery' && 'Work Portfolio & Transformations'}
                {activeTab === 'settings' && 'Garage Business Profile & Settings'}
                {activeTab === 'backup' && 'System Backup & Recovery'}
              </h1>
              <span className="topbar-status-text">
                Live Data Synchronized with Public Website
              </span>
            </div>
          </div>

          <div className="topbar-right">
            <button className="topbar-view-site-btn" onClick={onBackToSite} title="Open customer website">
              <ExternalLink size={16} />
              <span>Live Website</span>
            </button>
            <div className="admin-user-pill">
              <ShieldCheck size={16} className="pill-shield" />
              <span className="user-email-text">admin@mahadevgarage.com</span>
            </div>
            <button className="topbar-logout-btn" onClick={adminLogout} title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Dynamic Body Content by Tab */}
        <main className="admin-tab-content">
          {/* ==================== 1. OVERVIEW TAB ==================== */}
          {activeTab === 'overview' && (
            <div className="tab-pane overview-pane">
              {/* Metric KPI Cards */}
              <div className="kpi-grid">
                <div className="kpi-card" onClick={() => setActiveTab('bookings')}>
                  <div className="kpi-icon-wrap icon-blue">
                    <Calendar size={24} />
                  </div>
                  <div className="kpi-data">
                    <span className="kpi-number">{bookings.length}</span>
                    <span className="kpi-label">Total Appointments</span>
                  </div>
                  <span className="kpi-subtext">{pendingCount} pending confirmation</span>
                </div>

                <div className="kpi-card" onClick={() => setActiveTab('services')}>
                  <div className="kpi-icon-wrap icon-red">
                    <Wrench size={24} />
                  </div>
                  <div className="kpi-data">
                    <span className="kpi-number">{data.services.length}</span>
                    <span className="kpi-label">Active Services</span>
                  </div>
                  <span className="kpi-subtext">Live on carousel & modal</span>
                </div>

                <div className="kpi-card" onClick={() => setActiveTab('reviews')}>
                  <div className="kpi-icon-wrap icon-gold">
                    <Star size={24} />
                  </div>
                  <div className="kpi-data">
                    <span className="kpi-number">{data.reviews.length}</span>
                    <span className="kpi-label">Verified Reviews</span>
                  </div>
                  <span className="kpi-subtext">{data.business.rating}★ Google Rating</span>
                </div>

                <div className="kpi-card" onClick={() => setActiveTab('gallery')}>
                  <div className="kpi-icon-wrap icon-green">
                    <ImageIcon size={24} />
                  </div>
                  <div className="kpi-data">
                    <span className="kpi-number">{data.gallery.length}</span>
                    <span className="kpi-label">Gallery Highlights</span>
                  </div>
                  <span className="kpi-subtext">Showcase transformations</span>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="quick-actions-card">
                <h3 className="section-card-title">Quick Administrative Actions</h3>
                <div className="quick-actions-btns">
                  <button className="btn btn-primary" onClick={handleOpenNewBooking}>
                    <Plus size={16} />
                    <span>Create Walk-In / Phone Booking</span>
                  </button>
                  <button className="btn btn-outline-dark" onClick={handleOpenNewService}>
                    <Plus size={16} />
                    <span>Add Workshop Service</span>
                  </button>
                  <button className="btn btn-outline-dark" onClick={handleOpenNewReview}>
                    <Plus size={16} />
                    <span>Add Customer Review</span>
                  </button>
                  <button className="btn btn-outline-dark" onClick={() => setActiveTab('settings')}>
                    <Settings size={16} />
                    <span>Update Contact / Hours</span>
                  </button>
                </div>
              </div>

              {/* Recent Bookings Feed */}
              <div className="overview-recent-card">
                <div className="card-header-flex">
                  <div>
                    <h3 className="section-card-title">Recent Appointment Requests</h3>
                    <p className="section-card-sub">Latest customer bookings submitted from the website</p>
                  </div>
                  <button className="btn-text-link" onClick={() => setActiveTab('bookings')}>
                    <span>View All ({bookings.length})</span>
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Mobile Cards for Overview (<640px) */}
                <div className="mobile-bookings-list mobile-only">
                  {bookings.slice(0, 3).map((b) => (
                    <div key={b.id} className="mobile-booking-card">
                      <div className="mb-card-header">
                        <div>
                          <span className="mb-booking-id">{b.id}</span>
                          <h4 className="mb-cust-name">{b.name}</h4>
                        </div>
                        <span className={`status-pill status-${b.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="mb-card-details">
                        <div className="mb-detail-row">
                          <Car size={14} className="detail-icon" />
                          <span>{b.brand} {b.model || ''}</span>
                        </div>
                        <div className="mb-detail-row">
                          <Wrench size={14} className="detail-icon" />
                          <span>{b.service}</span>
                        </div>
                        <div className="mb-detail-row">
                          <Clock size={14} className="detail-icon" />
                          <span>{b.date} ({b.timeSlot})</span>
                        </div>
                      </div>
                      <div className="mb-card-actions">
                        <a
                          href={`https://wa.me/91${b.phone}?text=${encodeURIComponent(`Hello ${b.name}, regarding your car service at Mahadev Mechanical Car Garage:`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mb-btn mb-btn-wa"
                        >
                          <MessageCircle size={15} />
                          <span>WhatsApp</span>
                        </a>
                        <a href={`tel:${b.phone}`} className="mb-btn mb-btn-call">
                          <Phone size={15} />
                          <span>Call</span>
                        </a>
                        <button className="mb-btn mb-btn-edit" onClick={() => handleOpenEditBooking(b)}>
                          <Edit3 size={15} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Laptop Table for Overview (>=640px) */}
                <div className="table-responsive desktop-only">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Customer</th>
                        <th>Car Model</th>
                        <th>Service Requested</th>
                        <th>Date & Slot</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(0, 5).map((b) => (
                        <tr key={b.id}>
                          <td className="cell-id"><strong>{b.id}</strong></td>
                          <td>
                            <div className="cell-cust-name">{b.name}</div>
                            <div className="cell-cust-phone">{b.phone}</div>
                          </td>
                          <td>{b.brand} {b.model}</td>
                          <td className="cell-service-name">{b.service}</td>
                          <td>
                            <div>{b.date}</div>
                            <div className="cell-muted">{b.timeSlot}</div>
                          </td>
                          <td>
                            <span className={`status-pill status-${b.status.toLowerCase().replace(/\s+/g, '-')}`}>
                              {b.status}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="action-btn-sm"
                                onClick={() => handleOpenEditBooking(b)}
                                title="Edit booking details"
                              >
                                <Edit3 size={15} />
                              </button>
                              <a
                                href={`https://wa.me/91${b.phone}?text=${encodeURIComponent(`Hello ${b.name}, regarding your car service appointment (${b.id}) at Mahadev Mechanical Car Garage:`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="action-btn-sm btn-wa"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle size={15} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2. APPOINTMENTS TAB (Mobile-First Cards + Laptop Table) ==================== */}
          {activeTab === 'bookings' && (
            <div className="tab-pane bookings-pane">
              {/* Header Controls */}
              <div className="pane-header-bar">
                <div className="search-filter-group">
                  <div className="search-input-wrap">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search customer, phone, car, ID..."
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>

                <button className="btn btn-primary btn-add-appointment" onClick={handleOpenNewBooking}>
                  <Plus size={16} />
                  <span>New Appointment</span>
                </button>
              </div>

              {/* Thumb-friendly Quick Status Filter Pills (Both Mobile & Laptop) */}
              <div className="status-pill-filter-bar">
                {['ALL', 'PENDING', 'CONFIRMED', 'IN PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    className={`filter-pill-btn ${bookingFilterStatus === st ? 'active' : ''}`}
                    onClick={() => setBookingFilterStatus(st)}
                  >
                    {st === 'ALL' ? `All (${bookings.length})` : st}
                    {st === 'PENDING' && pendingCount > 0 && (
                      <span className="pill-dot-pending">{pendingCount}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* 1. Mobile Cards View (<768px) */}
              <div className="mobile-bookings-list mobile-only">
                {filteredBookings.length === 0 ? (
                  <div className="empty-state-card">No appointments match your search or filter.</div>
                ) : (
                  filteredBookings.map((b) => (
                    <div key={b.id} className="mobile-booking-card">
                      <div className="mb-card-header">
                        <div>
                          <span className="mb-booking-id">{b.id}</span>
                          <h4 className="mb-cust-name">{b.name}</h4>
                          <a href={`tel:${b.phone}`} className="mb-phone-link">{b.phone}</a>
                        </div>
                        <select
                          className={`status-select status-${b.status.toLowerCase().replace(/\s+/g, '-')}`}
                          value={b.status}
                          onChange={(e) => {
                            updateBookingStatus(b.id, e.target.value);
                            showToast(`Status updated to ${e.target.value}`);
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div className="mb-card-details">
                        <div className="mb-detail-row">
                          <Car size={15} className="detail-icon" />
                          <span className="mb-car-text">{b.brand} {b.model || ''}</span>
                        </div>
                        <div className="mb-detail-row">
                          <Wrench size={15} className="detail-icon" />
                          <span className="mb-service-text">{b.service}</span>
                        </div>
                        <div className="mb-detail-row">
                          <Clock size={15} className="detail-icon" />
                          <span className="mb-time-text">{b.date} • {b.timeSlot}</span>
                        </div>
                        {b.notes && (
                          <div className="mb-notes-box">
                            <strong>Note:</strong> {b.notes}
                          </div>
                        )}
                      </div>

                      <div className="mb-card-actions">
                        <a
                          href={`https://wa.me/91${b.phone}?text=${encodeURIComponent(`Hello ${b.name}, updating you regarding your car service at Mahadev Mechanical Car Garage:`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mb-btn mb-btn-wa"
                        >
                          <MessageCircle size={16} />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href={`tel:${b.phone}`}
                          className="mb-btn mb-btn-call"
                        >
                          <Phone size={16} />
                          <span>Call</span>
                        </a>
                        <button
                          className="mb-btn mb-btn-edit"
                          onClick={() => handleOpenEditBooking(b)}
                        >
                          <Edit3 size={16} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="mb-btn mb-btn-del"
                          onClick={() => setDeleteConfirmTarget({ type: 'booking', id: b.id, name: `${b.name} (${b.id})` })}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 2. Desktop & Laptop Table View (>=768px) */}
              <div className="admin-content-card desktop-table-wrapper desktop-only">
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Customer</th>
                        <th>Vehicle</th>
                        <th>Service</th>
                        <th>Date & Timing</th>
                        <th>Status</th>
                        <th>Source</th>
                        <th>Manage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="empty-table-cell">
                            No appointments match your search or filter.
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.map((b) => (
                          <tr key={b.id}>
                            <td className="cell-id">
                              <strong>{b.id}</strong>
                            </td>
                            <td>
                              <div className="cell-cust-name">{b.name}</div>
                              <div className="cell-cust-phone">{b.phone}</div>
                            </td>
                            <td>
                              <div className="cell-car-info">
                                <Car size={14} className="cell-car-icon" />
                                <span>{b.brand} {b.model || ''}</span>
                              </div>
                            </td>
                            <td>
                              <span className="cell-service-name">{b.service}</span>
                              {b.notes && <div className="cell-notes" title={b.notes}>Note: {b.notes}</div>}
                            </td>
                            <td>
                              <div><strong>{b.date}</strong></div>
                              <div className="cell-muted">{b.timeSlot}</div>
                            </td>
                            <td>
                              <select
                                className={`status-select status-${b.status.toLowerCase().replace(/\s+/g, '-')}`}
                                value={b.status}
                                onChange={(e) => {
                                  updateBookingStatus(b.id, e.target.value);
                                  showToast(`Status updated to ${e.target.value}`);
                                }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td>
                              <span className="source-pill">{b.source || 'Website'}</span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className="action-btn-sm"
                                  onClick={() => handleOpenEditBooking(b)}
                                  title="Edit Booking"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <a
                                  href={`tel:${b.phone}`}
                                  className="action-btn-sm btn-call"
                                  title="Call Customer"
                                >
                                  <Phone size={15} />
                                </a>
                                <a
                                  href={`https://wa.me/91${b.phone}?text=${encodeURIComponent(`Hello ${b.name}, updating you regarding your car service at Mahadev Mechanical Car Garage:`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="action-btn-sm btn-wa"
                                  title="WhatsApp Customer"
                                >
                                  <MessageCircle size={15} />
                                </a>
                                <button
                                  className="action-btn-sm btn-delete"
                                  onClick={() => setDeleteConfirmTarget({ type: 'booking', id: b.id, name: `${b.name} (${b.id})` })}
                                  title="Delete Booking"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 3. SERVICES TAB ==================== */}
          {activeTab === 'services' && (
            <div className="tab-pane services-pane">
              <div className="pane-header-bar">
                <div className="search-input-wrap">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search workshop services..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="search-input"
                  />
                </div>

                <button className="btn btn-primary" onClick={handleOpenNewService}>
                  <Plus size={16} />
                  <span>Add New Service</span>
                </button>
              </div>

              <div className="admin-services-grid">
                {filteredServices.map((svc) => (
                  <div key={svc.id} className="admin-service-card">
                    <div className="service-card-img-wrap">
                      <img src={svc.image} alt={svc.title} className="service-thumb" />
                      <span className="service-tag-badge">{svc.tag}</span>
                    </div>

                    <div className="service-card-body">
                      <h4 className="service-card-title">{svc.title}</h4>
                      <p className="service-card-desc">{svc.shortDesc}</p>

                      <div className="service-highlights-list">
                        {(svc.highlights || []).slice(0, 3).map((h, i) => (
                          <span key={i} className="highlight-mini-pill">✓ {h}</span>
                        ))}
                      </div>

                      <div className="service-card-actions">
                        <button
                          className="btn-card-edit"
                          onClick={() => handleOpenEditService(svc)}
                        >
                          <Edit3 size={15} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="btn-card-delete"
                          onClick={() => setDeleteConfirmTarget({ type: 'service', id: svc.id, name: svc.title })}
                        >
                          <Trash2 size={15} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 4. REVIEWS TAB ==================== */}
          {activeTab === 'reviews' && (
            <div className="tab-pane reviews-pane">
              <div className="pane-header-bar">
                <p className="pane-sub-info">
                  Customer testimonials auto-rotate on the home page every 4–5 seconds.
                </p>
                <button className="btn btn-primary" onClick={handleOpenNewReview}>
                  <Plus size={16} />
                  <span>Add Customer Review</span>
                </button>
              </div>

              <div className="admin-reviews-grid">
                {data.reviews.map((r) => (
                  <div key={r.id} className="admin-review-card">
                    <div className="review-card-top">
                      <div className="review-stars">
                        {[...Array(r.rating || 5)].map((_, i) => (
                          <Star key={i} size={16} fill="#FBBF24" color="#FBBF24" />
                        ))}
                      </div>
                      {r.verified && (
                        <span className="verified-pill">
                          <CheckCircle2 size={12} />
                          Verified
                        </span>
                      )}
                    </div>

                    <blockquote className="review-text">
                      "{r.comment}"
                    </blockquote>

                    <div className="review-meta">
                      <div className="review-author-col">
                        <span className="review-author-name">{r.author}</span>
                        <span className="review-car">{r.vehicle}</span>
                      </div>
                      <span className="review-date-text">{r.date}</span>
                    </div>

                    <div className="review-card-footer">
                      <button
                        className="btn-card-edit"
                        onClick={() => handleOpenEditReview(r)}
                      >
                        <Edit3 size={14} />
                        <span>Edit</span>
                      </button>
                      <button
                        className="btn-card-delete"
                        onClick={() => setDeleteConfirmTarget({ type: 'review', id: r.id, name: r.author })}
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 5. GALLERY TAB ==================== */}
          {activeTab === 'gallery' && (
            <div className="tab-pane gallery-pane">
              <div className="pane-header-bar">
                <p className="pane-sub-info">
                  Real workshop bay photos & transformation before-after slides.
                </p>
                <button className="btn btn-primary" onClick={handleOpenNewGallery}>
                  <Plus size={16} />
                  <span>Add Gallery Item</span>
                </button>
              </div>

              <div className="admin-gallery-grid">
                {data.gallery.map((g) => (
                  <div key={g.id} className="admin-gallery-card">
                    <div className="gallery-card-img-wrap">
                      <img src={g.image} alt={g.title} className="gallery-thumb" />
                      <span className="gallery-cat-pill">{g.category}</span>
                    </div>

                    <div className="gallery-card-body">
                      <h4 className="gallery-card-title">{g.title}</h4>
                      <p className="gallery-card-desc">{g.description}</p>

                      <div className="gallery-card-actions">
                        <button
                          className="btn-card-edit"
                          onClick={() => handleOpenEditGallery(g)}
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="btn-card-delete"
                          onClick={() => setDeleteConfirmTarget({ type: 'gallery', id: g.id, name: g.title })}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 6. SETTINGS TAB ==================== */}
          {activeTab === 'settings' && (
            <div className="tab-pane settings-pane">
              <form onSubmit={handleSaveSettings} className="settings-form">
                {/* Business Information Card */}
                <div className="admin-content-card">
                  <h3 className="section-card-title">Garage Identity & Brand Info</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Garage Business Name</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        value={businessForm.name || ''}
                        onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Short Brand Name</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        value={businessForm.shortName || ''}
                        onChange={(e) => setBusinessForm({ ...businessForm, shortName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Main Tagline</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        value={businessForm.tagline || ''}
                        onChange={(e) => setBusinessForm({ ...businessForm, tagline: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Location Badge Header</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        value={businessForm.locationBadge || ''}
                        onChange={(e) => setBusinessForm({ ...businessForm, locationBadge: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group form-group-full">
                      <label>Sub-Tagline Description</label>
                      <textarea
                        className="admin-form-input"
                        rows="2"
                        value={businessForm.subTagline || ''}
                        onChange={(e) => setBusinessForm({ ...businessForm, subTagline: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact & Location Card */}
                <div className="admin-content-card">
                  <h3 className="section-card-title">Customer Contact & Directions</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Direct Phone Number</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        value={contactForm.phone || ''}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value, phoneDisplay: '+91 ' + e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>WhatsApp Number (without +)</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        value={contactForm.whatsapp || ''}
                        onChange={(e) => setContactForm({ ...contactForm, whatsapp: e.target.value, whatsappDisplay: '+91 ' + e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Garage Email Address</label>
                      <input
                        type="email"
                        className="admin-form-input"
                        value={contactForm.email || ''}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Google Maps Directions URL</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        value={contactForm.googleMapsDirectionsUrl || ''}
                        onChange={(e) => setContactForm({ ...contactForm, googleMapsDirectionsUrl: e.target.value })}
                      />
                    </div>

                    <div className="form-group form-group-full">
                      <label>Full Physical Address</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        value={contactForm.address?.full || ''}
                        onChange={(e) => setContactForm({
                          ...contactForm,
                          address: { ...contactForm.address, full: e.target.value }
                        })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Social Media Channels Card */}
                <div className="admin-content-card">
                  <h3 className="section-card-title">Social Media Accounts</h3>
                  <p className="section-card-sub" style={{ margin: '0.35rem 0 1.25rem 0', color: '#6B7280', fontSize: '0.9rem' }}>
                    Connect and update your official garage channels shown in the "Connect With Us" section.
                  </p>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Instagram Account URL</label>
                      <input
                        type="url"
                        className="admin-form-input"
                        value={contactForm.social?.instagram || ''}
                        onChange={(e) => setContactForm({
                          ...contactForm,
                          social: { ...(contactForm.social || {}), instagram: e.target.value }
                        })}
                        placeholder="https://www.instagram.com/..."
                      />
                    </div>

                    <div className="form-group">
                      <label>Facebook Account / Page URL</label>
                      <input
                        type="url"
                        className="admin-form-input"
                        value={contactForm.social?.facebook || ''}
                        onChange={(e) => setContactForm({
                          ...contactForm,
                          social: { ...(contactForm.social || {}), facebook: e.target.value }
                        })}
                        placeholder="https://www.facebook.com/..."
                      />
                    </div>

                    <div className="form-group form-group-full">
                      <label>YouTube Channel URL</label>
                      <input
                        type="url"
                        className="admin-form-input"
                        value={contactForm.social?.youtube || ''}
                        onChange={(e) => setContactForm({
                          ...contactForm,
                          social: { ...(contactForm.social || {}), youtube: e.target.value }
                        })}
                        placeholder="https://youtube.com/@..."
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-submit-row">
                  <button type="submit" className="btn btn-primary btn-lg">
                    <Save size={18} />
                    <span>Save Website Changes</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==================== 7. BACKUP TAB ==================== */}
          {activeTab === 'backup' && (
            <div className="tab-pane backup-pane">
              <div className="admin-content-card">
                <h3 className="section-card-title">Data Backup & Recovery</h3>
                <p className="section-card-sub">
                  Download a JSON backup of all services, customer reviews, gallery images, and appointment bookings.
                </p>

                <div className="backup-actions-grid">
                  <div className="backup-action-box">
                    <div className="box-icon-wrap icon-blue">
                      <Download size={24} />
                    </div>
                    <h4>Export Backup</h4>
                    <p>Save all website data to an offline JSON file on your computer.</p>
                    <button className="btn btn-primary" onClick={exportDataBackup}>
                      <Download size={16} />
                      <span>Download JSON Backup</span>
                    </button>
                  </div>

                  <div className="backup-action-box">
                    <div className="box-icon-wrap icon-green">
                      <Upload size={24} />
                    </div>
                    <h4>Restore from Backup</h4>
                    <p>Upload a previously exported JSON backup file to restore website content.</p>
                    <label className="btn btn-outline-dark file-upload-label">
                      <Upload size={16} />
                      <span>Select JSON Backup File</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  <div className="backup-action-box danger-box">
                    <div className="box-icon-wrap icon-red">
                      <RotateCcw size={24} />
                    </div>
                    <h4>Restore Factory Defaults</h4>
                    <p>Reset the website to original default services, gallery, and reviews.</p>
                    <button className="btn btn-danger" onClick={handleResetFactory}>
                      <RotateCcw size={16} />
                      <span>Reset to Factory Defaults</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== MOBILE-FIRST STICKY BOTTOM BAR (<768px) ==================== */}
      <nav className="admin-mobile-bottom-bar" aria-label="Mobile Navigation">
        <button
          className={`mobile-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </button>

        <button
          className={`mobile-tab-item ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          <div className="mobile-icon-badge-wrap">
            <Calendar size={20} />
            {pendingCount > 0 && <span className="mobile-badge-count">{pendingCount}</span>}
          </div>
          <span>Bookings</span>
        </button>

        <button
          className={`mobile-tab-item ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <Wrench size={20} />
          <span>Services</span>
        </button>

        <button
          className={`mobile-tab-item ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <Star size={20} />
          <span>Reviews</span>
        </button>

        <button
          className={`mobile-tab-item ${mobileMenuOpen ? 'active' : ''}`}
          onClick={() => setMobileMenuOpen(true)}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* ==================== MODALS ==================== */}

      {/* 1. SERVICE MODAL */}
      {isServiceModalOpen && editingService && (
        <div className="admin-modal-backdrop" onClick={() => setIsServiceModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h3>{editingService.id ? 'Edit Service' : 'Add New Service'}</h3>
              <button className="modal-x-btn" onClick={() => setIsServiceModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveService}>
              <div className="modal-body-scroll">
                <div className="form-group">
                  <label>Service Title</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingService.title}
                    onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                    placeholder="e.g. Japanese Engine Carbon Cleaning"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category Tag Badge</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingService.tag}
                    onChange={(e) => setEditingService({ ...editingService, tag: e.target.value })}
                    placeholder="e.g. Popular, Advanced Tech, Quick Service"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Image URL or Path</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingService.image}
                    onChange={(e) => setEditingService({ ...editingService, image: e.target.value })}
                    placeholder="/images/periodic-service.jpg or https://..."
                    required
                  />
                  <div className="preset-links-row">
                    <span>Presets:</span>
                    <button type="button" onClick={() => setEditingService({ ...editingService, image: '/images/periodic-service.jpg' })}>Periodic</button>
                    <button type="button" onClick={() => setEditingService({ ...editingService, image: '/images/foam-wash.jpg' })}>Foam Wash</button>
                    <button type="button" onClick={() => setEditingService({ ...editingService, image: '/images/car-detailing.jpg' })}>Detailing</button>
                    <button type="button" onClick={() => setEditingService({ ...editingService, image: '/images/carbon-cleaning.jpg' })}>Carbon Clean</button>
                    <button type="button" onClick={() => setEditingService({ ...editingService, image: '/images/ac-service.jpg' })}>AC Service</button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Short Description (for carousel card)</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingService.shortDesc}
                    onChange={(e) => setEditingService({ ...editingService, shortDesc: e.target.value })}
                    placeholder="Brief 1-line summary"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Full Description</label>
                  <textarea
                    className="admin-form-input"
                    rows="3"
                    value={editingService.fullDesc}
                    onChange={(e) => setEditingService({ ...editingService, fullDesc: e.target.value })}
                    placeholder="Detailed explanation of the service..."
                  />
                </div>

                <div className="form-group">
                  <label>Key Highlights (comma-separated)</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={Array.isArray(editingService.highlights) ? editingService.highlights.join(', ') : editingService.highlights}
                    onChange={(e) => setEditingService({ ...editingService, highlights: e.target.value })}
                    placeholder="e.g. OEM Filters, 40-Point Check, Coolant Top-Up"
                  />
                </div>
              </div>

              <div className="modal-bottom-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsServiceModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Service</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. REVIEW MODAL */}
      {isReviewModalOpen && editingReview && (
        <div className="admin-modal-backdrop" onClick={() => setIsReviewModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h3>{editingReview.id ? 'Edit Customer Review' : 'Add Customer Review'}</h3>
              <button className="modal-x-btn" onClick={() => setIsReviewModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveReview}>
              <div className="modal-body-scroll">
                <div className="form-group">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingReview.author}
                    onChange={(e) => setEditingReview({ ...editingReview, author: e.target.value })}
                    placeholder="e.g. Rahul Verma"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Customer Vehicle</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingReview.vehicle}
                    onChange={(e) => setEditingReview({ ...editingReview, vehicle: e.target.value })}
                    placeholder="e.g. Hyundai Creta / Swift Dzire"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Star Rating (1 - 5)</label>
                  <select
                    className="admin-form-input"
                    value={editingReview.rating}
                    onChange={(e) => setEditingReview({ ...editingReview, rating: Number(e.target.value) })}
                  >
                    <option value="5">5 Stars (★★★★★)</option>
                    <option value="4">4 Stars (★★★★☆)</option>
                    <option value="3">3 Stars (★★★☆☆)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Review Comment / Quote</label>
                  <textarea
                    className="admin-form-input"
                    rows="3"
                    value={editingReview.comment}
                    onChange={(e) => setEditingReview({ ...editingReview, comment: e.target.value })}
                    placeholder="Customer's review comment..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Review Date / Tag</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingReview.date}
                    onChange={(e) => setEditingReview({ ...editingReview, date: e.target.value })}
                    placeholder="e.g. 2 weeks ago"
                  />
                </div>

                <div className="checkbox-wrap">
                  <label>
                    <input
                      type="checkbox"
                      checked={editingReview.verified}
                      onChange={(e) => setEditingReview({ ...editingReview, verified: e.target.checked })}
                    />
                    <span>Show "Verified Customer" Badge</span>
                  </label>
                </div>
              </div>

              <div className="modal-bottom-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsReviewModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. GALLERY MODAL */}
      {isGalleryModalOpen && editingGalleryItem && (
        <div className="admin-modal-backdrop" onClick={() => setIsGalleryModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h3>{editingGalleryItem.id ? 'Edit Gallery Photo' : 'Add Gallery Photo'}</h3>
              <button className="modal-x-btn" onClick={() => setIsGalleryModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveGallery}>
              <div className="modal-body-scroll">
                <div className="form-group">
                  <label>Item Title</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingGalleryItem.title}
                    onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, title: e.target.value })}
                    placeholder="e.g. Engine Bay Decarbonization"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingGalleryItem.category}
                    onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, category: e.target.value })}
                    placeholder="e.g. Engine, Detailing, AC, Washing"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingGalleryItem.image}
                    onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, image: e.target.value })}
                    placeholder="https://..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="admin-form-input"
                    rows="2"
                    value={editingGalleryItem.description}
                    onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, description: e.target.value })}
                    placeholder="Work details..."
                  />
                </div>
              </div>

              <div className="modal-bottom-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsGalleryModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Gallery Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. BOOKING MODAL */}
      {isBookingModalOpen && editingBooking && (
        <div className="admin-modal-backdrop" onClick={() => setIsBookingModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h3>{editingBooking.id ? `Edit Appointment (${editingBooking.id})` : 'New Walk-In / Phone Booking'}</h3>
              <button className="modal-x-btn" onClick={() => setIsBookingModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveBooking}>
              <div className="modal-body-scroll">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={editingBooking.name}
                      onChange={(e) => setEditingBooking({ ...editingBooking, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={editingBooking.phone}
                      onChange={(e) => setEditingBooking({ ...editingBooking, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Car Brand</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={editingBooking.brand}
                      onChange={(e) => setEditingBooking({ ...editingBooking, brand: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Car Model</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={editingBooking.model}
                      onChange={(e) => setEditingBooking({ ...editingBooking, model: e.target.value })}
                      placeholder="e.g. Swift Dzire / Creta"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Service Selected</label>
                  <select
                    className="admin-form-input"
                    value={editingBooking.service}
                    onChange={(e) => setEditingBooking({ ...editingBooking, service: e.target.value })}
                  >
                    {data.services.map(s => (
                      <option key={s.id} value={s.title}>{s.title}</option>
                    ))}
                    <option value="General Inspection">General Inspection / Other</option>
                  </select>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Appointment Date</label>
                    <input
                      type="date"
                      className="admin-form-input"
                      value={editingBooking.date}
                      onChange={(e) => setEditingBooking({ ...editingBooking, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Time Slot</label>
                    <select
                      className="admin-form-input"
                      value={editingBooking.timeSlot}
                      onChange={(e) => setEditingBooking({ ...editingBooking, timeSlot: e.target.value })}
                    >
                      <option value="Morning (09:00 AM - 12:00 PM)">Morning (09:00 AM - 12:00 PM)</option>
                      <option value="Afternoon (12:00 PM - 03:00 PM)">Afternoon (12:00 PM - 03:00 PM)</option>
                      <option value="Evening (03:00 PM - 07:00 PM)">Evening (03:00 PM - 07:00 PM)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="admin-form-input"
                    value={editingBooking.status}
                    onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Notes / Vehicle Issue</label>
                  <textarea
                    className="admin-form-input"
                    rows="2"
                    value={editingBooking.notes || ''}
                    onChange={(e) => setEditingBooking({ ...editingBooking, notes: e.target.value })}
                    placeholder="Customer complaints or inspection notes..."
                  />
                </div>
              </div>

              <div className="modal-bottom-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsBookingModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Appointment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. DELETE CONFIRMATION MODAL */}
      {deleteConfirmTarget && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteConfirmTarget(null)}>
          <div className="admin-modal-card modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-wrap">
              <AlertTriangle size={32} className="alert-amber" />
            </div>
            <h3 className="confirm-title">Confirm Deletion</h3>
            <p className="confirm-text">
              Are you sure you want to permanently delete <strong>"{deleteConfirmTarget.name}"</strong>? This will immediately remove it from the website.
            </p>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
