import React, { useState, useEffect, lazy, Suspense } from 'react';
import { GarageProvider, useGarage } from './context/GarageContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BottomBar from './components/BottomBar';
import HomePage from './pages/HomePage';
import { DEDICATED_SERVICES } from './config/seoData';

// Code-split dedicated subpages & heavy interactive modals
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const AppointmentModal = lazy(() => import('./components/AppointmentModal'));
const VideoModal = lazy(() => import('./components/VideoModal'));
const AdminLogin = lazy(() => import('./components/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));

const isAdminRoute = () => {
  const hash = (window.location.hash || '').toLowerCase();
  const path = (window.location.pathname || '').toLowerCase().replace(/\/$/, '');
  return hash === '#admin' || path === '/admin';
};

const getCleanPath = () => {
  const path = (window.location.pathname || '/').toLowerCase().replace(/\/$/, '') || '/';
  return path;
};

function GarageWebsiteApp() {
  const { isAdminLoggedIn, isLoadingAuth } = useGarage();
  const [currentPath, setCurrentPath] = useState(getCleanPath);
  const [isAdminView, setIsAdminView] = useState(isAdminRoute);

  const [isBookingOpen, setIsBookingOpen] = useState(() => {
    return getCleanPath() === '/book-appointment';
  });
  const [selectedService, setSelectedService] = useState(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  // Synchronize route changes from browser navigation (Back/Forward, address bar, popstate, hashchange)
  useEffect(() => {
    const handleRouteSync = () => {
      const isNowAdmin = isAdminRoute();
      setIsAdminView(isNowAdmin);

      const path = getCleanPath();
      setCurrentPath(path);

      if (path === '/book-appointment') {
        setIsBookingOpen(true);
      }

      // Handle anchor scrolling if hash is present
      if (window.location.hash && window.location.hash !== '#admin') {
        const targetId = window.location.hash.substring(1);
        const el = document.getElementById(targetId);
        if (el) {
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }
    };

    window.addEventListener('popstate', handleRouteSync);
    window.addEventListener('hashchange', handleRouteSync);
    return () => {
      window.removeEventListener('popstate', handleRouteSync);
      window.removeEventListener('hashchange', handleRouteSync);
    };
  }, []);

  // Programmatic client-side navigation
  const handleNavigate = (toUrl) => {
    if (!toUrl) return;

    // Admin routing
    if (toUrl === '/admin' || toUrl === '#admin') {
      window.location.hash = '#admin';
      setIsAdminView(true);
      window.scrollTo(0, 0);
      return;
    }

    // Anchor on current page
    if (toUrl.startsWith('#')) {
      const targetId = toUrl.substring(1);
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Path navigation (with optional hash)
    const [pathPart, hashPart] = toUrl.split('#');
    const cleanPath = (pathPart || '/').toLowerCase().replace(/\/$/, '') || '/';

    if (window.location.pathname !== cleanPath) {
      window.history.pushState(null, '', toUrl);
    }

    setCurrentPath(cleanPath);
    setIsAdminView(false);

    if (cleanPath === '/book-appointment') {
      setIsBookingOpen(true);
    }

    if (hashPart) {
      setTimeout(() => {
        const el = document.getElementById(hashPart);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  };

  const handleBackToSite = () => {
    if (window.location.hash.toLowerCase() === '#admin') {
      window.location.hash = '';
    }
    if (window.location.pathname.toLowerCase().replace(/\/$/, '') === '/admin') {
      window.history.pushState(null, '', '/');
    }
    setIsAdminView(false);
    setCurrentPath('/');
    window.scrollTo(0, 0);
  };

  const handleOpenBooking = (service = null) => {
    setSelectedService(service);
    setIsBookingOpen(true);
  };

  const handleCloseBooking = () => {
    setIsBookingOpen(false);
    setSelectedService(null);
    if (currentPath === '/book-appointment') {
      window.history.replaceState(null, '', '/');
      setCurrentPath('/');
    }
  };

  // If in admin mode: show loading, AdminLogin, or AdminDashboard
  if (isAdminView) {
    const adminLoadingSpinner = (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0F19',
        color: '#F8FAFC'
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          border: '3px solid rgba(220, 38, 38, 0.2)',
          borderTopColor: '#DC2626',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '1rem', color: '#94A3B8', fontSize: '0.9rem', fontWeight: 500 }}>
          Verifying secure session...
        </p>
      </div>
    );

    if (isLoadingAuth) {
      return adminLoadingSpinner;
    }
    if (!isAdminLoggedIn) {
      return (
        <Suspense fallback={adminLoadingSpinner}>
          <AdminLogin onBackToSite={handleBackToSite} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={adminLoadingSpinner}>
        <AdminDashboard onBackToSite={handleBackToSite} />
      </Suspense>
    );
  }

  // Determine which page component to render based on current clean path
  const renderCurrentPage = () => {
    // Dedicated Service Pages
    const dedicatedSlug = currentPath.replace('/', '');
    if (DEDICATED_SERVICES[dedicatedSlug]) {
      return (
        <Suspense fallback={<div className="page-load-placeholder" />}>
          <ServiceDetailPage 
            service={DEDICATED_SERVICES[dedicatedSlug]} 
            onOpenBooking={handleOpenBooking} 
            onNavigate={handleNavigate}
          />
        </Suspense>
      );
    }

    switch (currentPath) {
      case '/':
      case '/book-appointment':
        return (
          <HomePage 
            onOpenBooking={handleOpenBooking} 
            onOpenVideo={() => setIsVideoOpen(true)} 
            onNavigate={handleNavigate}
          />
        );

      case '/services':
        return (
          <Suspense fallback={<div className="page-load-placeholder" />}>
            <ServicesPage 
              onOpenBooking={handleOpenBooking} 
              onNavigate={handleNavigate} 
            />
          </Suspense>
        );

      case '/about':
        return (
          <Suspense fallback={<div className="page-load-placeholder" />}>
            <AboutPage 
              onOpenBooking={handleOpenBooking} 
              onNavigate={handleNavigate} 
            />
          </Suspense>
        );

      case '/contact':
        return (
          <Suspense fallback={<div className="page-load-placeholder" />}>
            <ContactPage 
              onOpenBooking={handleOpenBooking} 
              onNavigate={handleNavigate} 
            />
          </Suspense>
        );

      case '/gallery':
        return (
          <Suspense fallback={<div className="page-load-placeholder" />}>
            <GalleryPage 
              onOpenBooking={handleOpenBooking} 
              onNavigate={handleNavigate} 
            />
          </Suspense>
        );

      case '/reviews':
      case '/happy-customers':
        return (
          <Suspense fallback={<div className="page-load-placeholder" />}>
            <ReviewsPage 
              onOpenBooking={handleOpenBooking} 
              onNavigate={handleNavigate} 
            />
          </Suspense>
        );

      default:
        return (
          <Suspense fallback={<div className="page-load-placeholder" />}>
            <NotFoundPage 
              onOpenBooking={handleOpenBooking} 
              onNavigate={handleNavigate} 
            />
          </Suspense>
        );
    }
  };

  return (
    <div className="garage-app">
      {/* Top Navbar */}
      <Navbar onOpenBooking={() => handleOpenBooking()} onNavigate={handleNavigate} />

      {/* Main Landmark: Primary Website Content */}
      <main id="main-content" className="main-content" tabIndex="-1">
        {renderCurrentPage()}
      </main>

      {/* Workshop Location, Timings & Footer */}
      <Footer onOpenBooking={() => handleOpenBooking()} onNavigate={handleNavigate} />

      {/* Sticky High-Converting Bottom Action Bar */}
      <BottomBar />

      {/* Interactive Appointment Booking Modal */}
      {isBookingOpen && (
        <Suspense fallback={null}>
          <AppointmentModal 
            isOpen={isBookingOpen} 
            onClose={handleCloseBooking} 
            initialService={selectedService}
          />
        </Suspense>
      )}

      {/* Workshop Tour Video Modal */}
      {isVideoOpen && (
        <Suspense fallback={null}>
          <VideoModal 
            isOpen={isVideoOpen} 
            onClose={() => setIsVideoOpen(false)} 
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <GarageProvider>
      <GarageWebsiteApp />
    </GarageProvider>
  );
}
