import React, { useState, useEffect } from 'react';
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
import AppointmentModal from './components/AppointmentModal';
import VideoModal from './components/VideoModal';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';

function GarageWebsiteApp() {
  const { isAdminLoggedIn } = useGarage();
  const [currentView, setCurrentView] = useState(() => {
    return window.location.hash === '#admin' ? 'admin' : 'site';
  });

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  // Synchronize hash routing with view state
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setCurrentView('admin');
        window.scrollTo(0, 0);
      } else if (currentView === 'admin' && window.location.hash !== '#admin') {
        setCurrentView('site');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);

  const handleBackToSite = () => {
    window.location.hash = '';
    setCurrentView('site');
    window.scrollTo(0, 0);
  };

  // If in admin mode: show AdminLogin or AdminDashboard
  if (currentView === 'admin') {
    if (!isAdminLoggedIn) {
      return <AdminLogin onBackToSite={handleBackToSite} />;
    }
    return <AdminDashboard onBackToSite={handleBackToSite} />;
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

      {/* Workshop Location, Timings & Footer */}
      <Footer onOpenBooking={() => handleOpenBooking()} />

      {/* Sticky High-Converting Bottom Action Bar */}
      <BottomBar />

      {/* Interactive Appointment Booking Modal */}
      <AppointmentModal 
        isOpen={isBookingOpen} 
        onClose={handleCloseBooking} 
        initialService={selectedService}
      />

      {/* Workshop Tour Video Modal */}
      <VideoModal 
        isOpen={isVideoOpen} 
        onClose={() => setIsVideoOpen(false)} 
      />
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
