import React from 'react';
import { Home, Wrench, Calendar, Phone } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { BASE_URL } from '../config/seoData';
import './NotFoundPage.css';

export default function NotFoundPage({ onOpenBooking, onNavigate }) {
  return (
    <div className="notfound-page">
      <SEOHead
        title="Page Not Found (404) | Mahadev Mechanical Car Garage Gohana"
        description="The page you are looking for cannot be found. Return to Mahadev Mechanical Car Garage in Gohana, Haryana for multi-brand car services."
        canonicalPath="/404"
        breadcrumbName="404 Not Found"
      />

      <div className="container notfound-container">
        <div className="notfound-card">
          <span className="notfound-code">404</span>
          <h1 className="notfound-title">Page Not Found</h1>
          <p className="notfound-desc">
            The page you requested may have been moved, renamed, or is temporarily unavailable. Let's get you back on track to your car care needs in Gohana.
          </p>

          <div className="notfound-actions">
            <a 
              href="/" 
              onClick={(e) => { e.preventDefault(); onNavigate('/'); }} 
              className="btn btn-primary notfound-btn"
            >
              <Home size={16} />
              <span>Back to Home</span>
            </a>
            <a 
              href="/services" 
              onClick={(e) => { e.preventDefault(); onNavigate('/services'); }} 
              className="btn btn-outline notfound-btn"
            >
              <Wrench size={16} />
              <span>View All Services</span>
            </a>
            <button
              type="button"
              onClick={() => onOpenBooking()}
              className="btn btn-outline notfound-btn"
            >
              <Calendar size={16} />
              <span>Book Appointment</span>
            </button>
          </div>

          <div className="notfound-support-note">
            <span>Need immediate roadside or repair advice? Call </span>
            <a href="tel:+918295669463" className="notfound-call-link">
              <Phone size={14} />
              <strong>+91 82956 69463</strong>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
