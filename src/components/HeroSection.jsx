import React, { Suspense, lazy } from 'react';
import { MapPin, Calendar, ClipboardList, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import ScorpioFallback from './ScorpioFallback';
import './HeroSection.css';

const ScorpioScene = lazy(() => import('./ScorpioScene'));

export default function HeroSection({ onOpenBooking, onNavigate }) {
  const { data } = useGarage();
  const business = data.business || {};

  return (
    <section id="hero" className="hero-section" aria-label="Hero Section">
      {/* Background with real workshop ambiance and subtle automotive gradient overlay */}
      <div className="hero-bg-wrapper">
        <picture>
          <source srcSet="/images/periodic-service.webp" type="image/webp" />
          <img 
            src="/images/periodic-service.jpg" 
            alt="Mahadev Mechanical Car Garage - Modern Workshop Bay" 
            className="hero-bg-img"
            width="900"
            height="506"
            loading="eager"
            decoding="async"
            fetchpriority="low"
          />
        </picture>
        <div className="hero-gradient-overlay" />
      </div>

      <div className="container hero-content-container">
        <div className="hero-grid-layout">
          {/* Left Column: Trust Badge, Headline, Subtitle, CTAs, Highlights */}
          <div className="hero-text-block">
            {/* Location Badge */}
            <div className="hero-badge">
              <span className="hero-badge-pin">
                <MapPin size={14} className="pin-icon" />
              </span>
              <span className="hero-badge-text">{business.locationBadge || 'Gohana, Haryana • Near JK Garden'}</span>
            </div>

            {/* Main Headline (Preserved Exact Wording & Red Highlight) */}
            <h1 className="hero-title">
              Complete Car Care <br />
              <span className="hero-title-highlight">Under One Roof</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-description">
              {business.subTagline || 'Gohana’s trusted multi-brand car workshop. Expert mechanics, genuine parts & upfront pricing.'}
            </p>

            {/* Action Buttons (Desktop placement; on mobile ordered after 3D visual via CSS) */}
            <div className="hero-cta-group">
              <button 
                onClick={() => onOpenBooking()} 
                className="btn btn-primary hero-btn-book"
                aria-label="Book Appointment"
              >
                <Calendar size={18} />
                <span>Book Appointment</span>
                <ArrowRight size={16} className="btn-arrow" />
              </button>

              <a 
                href="/services" 
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate('/services');
                  }
                }}
                className="btn btn-outline hero-btn-services"
                aria-label="View Services"
              >
                <ClipboardList size={18} />
                <span>View Services</span>
              </a>
            </div>

            {/* Quick Trust Highlights */}
            <div className="hero-quick-trust">
              <div className="quick-trust-item">
                <CheckCircle2 size={16} className="trust-check" />
                <span>OEM Spare Parts</span>
              </div>
              <div className="quick-trust-item">
                <CheckCircle2 size={16} className="trust-check" />
                <span>Japanese Carbon Cleaning</span>
              </div>
              <div className="quick-trust-item">
                <CheckCircle2 size={16} className="trust-check" />
                <span>Free 40-Point Inspection</span>
              </div>
            </div>
          </div>

          {/* Right Column (Desktop) / Mid Section (Mobile): 3D Black Scorpio-N Model */}
          <div className="hero-3d-visual-col" aria-label="3D Interactive Vehicle Showcase">
            <Suspense fallback={<ScorpioFallback />}>
              <ScorpioScene />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
