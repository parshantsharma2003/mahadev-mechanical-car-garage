import React, { useState, useEffect } from 'react';
import { Phone, Menu, X, Calendar, MapPin, ChevronRight } from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import './Navbar.css';

export default function Navbar({ onOpenBooking }) {
  const { data } = useGarage();
  const contact = data.contact;
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#hero' },
    { label: 'Services', href: '#services' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'Why Choose Us', href: '#why-us' },
    { label: 'Reviews', href: '#reviews' },
    { label: 'Location', href: '#contact' }
  ];

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className={`navbar-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container navbar-container">
          {/* Brand Logo */}
          <a href="#hero" className="brand-logo" aria-label="Mahadev Mechanical Car Garage Home">
            <img 
              src="/images/logo-transparent.png" 
              alt="Mahadev Mechanical Car Garage" 
              className="brand-logo-img" 
              width="140" 
              height="48"
            />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="nav-link">
                {link.label}
              </a>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="navbar-actions">
            {/* Phone Call Button */}
            <a 
              href={`tel:+91${contact.phone}`} 
              className="nav-call-btn" 
              title="Call Mahadev Garage"
              aria-label={`Call ${contact.phoneDisplay || contact.phone}`}
            >
              <Phone className="icon-phone" size={20} />
            </a>

            {/* Desktop Book CTA */}
            <button 
              onClick={() => onOpenBooking()} 
              className="btn btn-primary nav-book-btn desktop-only"
            >
              <Calendar size={18} />
              <span>Book Service</span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="mobile-toggle-btn"
              aria-label={mobileMenuOpen ? "Close Menu" : "Open Menu"}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <div className={`mobile-drawer-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <a href="#hero" onClick={() => setMobileMenuOpen(false)} className="drawer-brand-logo" aria-label="Mahadev Mechanical Car Garage Home">
              <img 
                src="/images/logo-transparent.png" 
                alt="Mahadev Mechanical Car Garage" 
                className="drawer-logo-img" 
                width="135" 
                height="44"
              />
            </a>
            <button 
              className="drawer-close-btn" 
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close Navigation"
            >
              <X size={22} />
            </button>
          </div>

          <div className="drawer-body">
            <nav className="drawer-links">
              {navLinks.map((link) => (
                <a 
                  key={link.href} 
                  href={link.href} 
                  className="drawer-nav-item" 
                  onClick={handleLinkClick}
                >
                  <span>{link.label}</span>
                  <ChevronRight size={18} className="drawer-arrow" />
                </a>
              ))}
            </nav>

            <div className="drawer-contact-card">
              <div className="drawer-info-row">
                <MapPin size={18} className="drawer-icon-red" />
                <div>
                  <strong>Workshop Location</strong>
                  <p>Rohtak - Panipat Rd, Near Indian Oil Pump, Gohana</p>
                </div>
              </div>
              <div className="drawer-info-row">
                <Phone size={18} className="drawer-icon-red" />
                <div>
                  <strong>Helpline / Booking</strong>
                  <p>{contact.phoneDisplay || contact.phone}</p>
                </div>
              </div>
            </div>

            <button 
              className="btn btn-primary drawer-book-btn"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
            >
              <Calendar size={18} />
              <span>Book Appointment Now</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
