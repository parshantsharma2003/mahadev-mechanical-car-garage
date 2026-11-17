import React from 'react';
import { 
  MapPin, 
  Phone, 
  MessageCircle, 
  Clock, 
  Mail, 
  Navigation, 
  Calendar,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { ROUTES_METADATA, BUSINESS_NAP, BASE_URL } from '../config/seoData';
import { useGarage } from '../context/GarageContext';
import './ContactPage.css';

export default function ContactPage({ onOpenBooking, onNavigate }) {
  const { data } = useGarage();
  const contact = data.contact || {};
  const meta = ROUTES_METADATA["/contact"];

  const phoneUrl = `tel:+91${contact.phone || '8295669463'}`;
  const whatsappUrl = `https://wa.me/${contact.whatsapp || '918295669463'}?text=${encodeURIComponent(
    'Hello Mahadev Mechanical Car Garage, I need assistance with my car.'
  )}`;
  const directionsUrl = contact.googleMapsDirectionsUrl;
  const embedUrl = contact.googleMapsEmbedUrl;

  return (
    <div className="contact-page">
      <SEOHead
        title={meta.title}
        description={meta.metaDescription}
        canonicalPath="/contact"
        ogImage={`${BASE_URL}/images/scorpio-n-hero.webp`}
        breadcrumbName="Contact Us"
      />

      {/* Breadcrumbs */}
      <nav className="detail-breadcrumbs" aria-label="Breadcrumb">
        <div className="container">
          <ol className="breadcrumb-list">
            <li className="breadcrumb-item">
              <a 
                href="/" 
                onClick={(e) => { e.preventDefault(); onNavigate('/'); }}
                className="breadcrumb-link"
              >
                Home
              </a>
            </li>
            <ChevronRight size={14} className="breadcrumb-sep" aria-hidden="true" />
            <li className="breadcrumb-item active" aria-current="page">
              Contact & Location
            </li>
          </ol>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="contact-hero-section">
        <div className="container">
          <div className="contact-hero-content">
            <div className="service-hero-tag">
              <MapPin size={14} />
              <span>Gohana, Haryana • Workshop Bay</span>
            </div>
            <h1 className="contact-hero-title">
              Contact Mahadev Mechanical Car Garage
            </h1>
            <p className="contact-hero-sub">
              Visit our workshop on the Gohana–Panipat Road near JK Garden, call for roadside consultation, or book an appointment online.
            </p>
          </div>
        </div>
      </header>

      {/* Contact Content Grid */}
      <main className="contact-main-grid-section">
        <div className="container">
          <div className="contact-grid-layout">
            {/* Left Column: Verified NAP Cards */}
            <div className="contact-info-cards-col">
              {/* Address Card */}
              <div className="contact-card">
                <div className="card-icon-bubble">
                  <MapPin size={22} className="text-red" />
                </div>
                <div className="card-text-block">
                  <h2 className="card-h2">Verified Workshop Address</h2>
                  <p className="card-detail-text">
                    <strong>Mahadev Mechanical Car Garage</strong><br />
                    Near JK Garden, Gohana–Panipat Road<br />
                    Gohana, Haryana 131301, India
                  </p>
                  <p className="card-landmarks-note">
                    Landmarks: Near Indian Oil Petrol Pump & JK Garden. Easily reachable from Rohtak Gate and Panipat Chungi.
                  </p>
                  <a 
                    href={directionsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="contact-action-link"
                  >
                    <Navigation size={15} />
                    <span>Get Google Maps Directions ➔</span>
                  </a>
                </div>
              </div>

              {/* Phone & WhatsApp Card */}
              <div className="contact-card">
                <div className="card-icon-bubble">
                  <Phone size={22} className="text-red" />
                </div>
                <div className="card-text-block">
                  <h2 className="card-h2">Direct Customer Communication</h2>
                  <p className="card-detail-text">
                    Speak directly with our senior technicians for repair queries, pricing, or appointment scheduling:
                  </p>
                  <div className="contact-btn-pair">
                    <a href={phoneUrl} className="btn-direct-contact call-btn">
                      <Phone size={16} />
                      <span>Call +91 82956 69463</span>
                    </a>
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-direct-contact wa-btn">
                      <MessageCircle size={16} />
                      <span>WhatsApp +91 82956 69463</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Operating Hours Card */}
              <div className="contact-card">
                <div className="card-icon-bubble">
                  <Clock size={22} className="text-red" />
                </div>
                <div className="card-text-block">
                  <h2 className="card-h2">Workshop Operating Hours</h2>
                  <div className="hours-schedule-table">
                    <div className="schedule-row">
                      <span className="day-name">Monday – Saturday</span>
                      <strong className="day-time">09:00 AM – 07:30 PM</strong>
                    </div>
                    <div className="schedule-row">
                      <span className="day-name">Sunday</span>
                      <strong className="day-time">10:00 AM – 04:00 PM <span className="text-sm font-normal text-muted">(By Appointment Only)</span></strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment Booking Trigger Card */}
              <div className="contact-booking-box">
                <div className="booking-box-text">
                  <h3>Prefer to Schedule in Advance?</h3>
                  <p>Book online and skip the waiting queue upon arrival.</p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenBooking()}
                  className="btn btn-primary booking-box-btn"
                >
                  <Calendar size={16} />
                  <span>Book Service Now</span>
                </button>
              </div>
            </div>

            {/* Right Column: Google Maps Embed */}
            <div className="contact-map-col">
              <div className="map-wrapper-card">
                <h2 className="map-heading">Find Us on Google Maps</h2>
                <div className="map-iframe-container">
                  <iframe 
                    title="Mahadev Mechanical Car Garage Location on Google Maps"
                    src={embedUrl}
                    width="100%" 
                    height="420" 
                    style={{ border: 0 }} 
                    allowFullScreen="" 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="map-footer-bar">
                  <div className="map-coord-tag">
                    <Navigation size={14} />
                    <span>GPS Coordinates: 29.1471882, 76.716434</span>
                  </div>
                  <a 
                    href={directionsUrl}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="map-nav-btn"
                  >
                    Open in Maps App
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
