import React, { useState, useEffect, lazy, Suspense } from 'react';
import { GarageProvider, useGarage } from './context/GarageContext';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import StatsBar from './components/StatsBar';
import ServicesSection from './components/ServicesSection';
import CarBrandsSection from './components/CarBrandsSection';
import WhyChooseUs from './components/WhyChooseUs';
import GalleryCarousel from './components/GalleryCarousel';
import TestimonialsSection from './components/TestimonialsSection';
import ConnectWithUsSection from './components/ConnectWithUsSection';
import CtaBanner from './components/CtaBanner';
import Footer from './components/Footer';
import BottomBar from './components/BottomBar';

// Code-split heavy interactive modals & admin modules
const AppointmentModal = lazy(() => import('./components/AppointmentModal'));
const VideoModal = lazy(() => import('./components/VideoModal'));
const AdminLogin = lazy(() => import('./components/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));

const isAdminRoute = () => {
  const hash = (window.location.hash || '').toLowerCase();
  const path = (window.location.pathname || '').toLowerCase().replace(/\/$/, '');
  return hash === '#admin' || path === '/admin';
};

function GarageWebsiteApp() {
  const { isAdminLoggedIn, isLoadingAuth } = useGarage();
  const [currentView, setCurrentView] = useState(() => {
    return isAdminRoute() ? 'admin' : 'site';
  });

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  // Synchronize URL routing (both /admin and #admin) with view state
  useEffect(() => {
    const checkRoute = () => {
      if (isAdminRoute()) {
        setCurrentView('admin');
        window.scrollTo(0, 0);
      } else if (currentView === 'admin' && !isAdminRoute()) {
        setCurrentView('site');
      }
    };

    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);
    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, [currentView]);

  const handleBackToSite = () => {
    if (window.location.hash.toLowerCase() === '#admin') {
      window.location.hash = '';
    }
    if (window.location.pathname.toLowerCase().replace(/\/$/, '') === '/admin') {
      window.history.pushState(null, '', '/');
    }
    setCurrentView('site');
    window.scrollTo(0, 0);
  };

  // If in admin mode: show loading, AdminLogin, or AdminDashboard
  if (currentView === 'admin') {
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

  const handleOpenBooking = (service = null) => {
    setSelectedService(service);
    setIsBookingOpen(true);
  };

  const handleCloseBooking = () => {
    setIsBookingOpen(false);
    setSelectedService(null);
  };

  return (
    <div className="garage-app">
      {/* Top Navbar */}
      <Navbar onOpenBooking={() => handleOpenBooking()} />

      {/* Main Landmark: Primary Website Content */}
      <main id="main-content" className="main-content" tabIndex="-1">
        {/* Static Professional Hero Section */}
        <HeroSection onOpenBooking={() => handleOpenBooking()} />

        {/* Trust & Performance Metrics Bar */}
        <StatsBar />

        {/* Services Carousel: Slow auto-scroll with manual swipe */}
        <ServicesSection onSelectService={(svc) => handleOpenBooking(svc)} />

        {/* Car Brands Carousel: Continuous scrolling and manual swipe */}
        <CarBrandsSection />

        {/* Why Choose Us & Video Showcase */}
        <WhyChooseUs onOpenVideo={() => setIsVideoOpen(true)} />

        {/* Gallery Carousel: Manual swipe with optional auto-scroll */}
        <GalleryCarousel />

        {/* Customer Reviews: Changes every 4-5 seconds */}
        <TestimonialsSection />

        {/* Connect With Us Section */}
        <ConnectWithUsSection />

        {/* Pre-Footer Action Banner */}
        <CtaBanner onOpenBooking={() => handleOpenBooking()} />
      </main>

      {/* Workshop Location, Timings & Footer */}
      <Footer onOpenBooking={() => handleOpenBooking()} />

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
