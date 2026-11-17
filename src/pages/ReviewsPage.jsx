import React from 'react';
import { Star, CheckCircle, MessageSquare, ExternalLink, ChevronRight, Calendar } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { ROUTES_METADATA, BASE_URL } from '../config/seoData';
import { useGarage } from '../context/GarageContext';
import './ReviewsPage.css';

export default function ReviewsPage({ onOpenBooking, onNavigate }) {
  const { data } = useGarage();
  const contact = data.contact || {};
  const reviews = data.reviews || [];
  const meta = ROUTES_METADATA["/reviews"];

  const gmapsReviewUrl = contact.googleMapsDirectionsUrl;

  return (
    <div className="reviews-page">
      <SEOHead
        title={meta.title}
        description={meta.metaDescription}
        canonicalPath="/reviews"
        ogImage={`${BASE_URL}/images/scorpio-n-hero.webp`}
        breadcrumbName="Customer Reviews"
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
              Customer Reviews
            </li>
          </ol>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="reviews-hero-section">
        <div className="container">
          <div className="reviews-hero-content">
            <div className="service-hero-tag">
              <MessageSquare size={14} />
              <span>Verified Customer Feedback • Gohana Bay</span>
            </div>
            <h1 className="reviews-hero-title">
              Customer Reviews & Workshop Feedback
            </h1>
            <p className="reviews-hero-sub">
              We take pride in transparent estimates, genuine spare parts, and dependable multi-brand car repairs. Here is what car owners in Gohana experience when visiting our garage.
            </p>
          </div>
        </div>
      </header>

      {/* Main Reviews Section */}
      <main className="reviews-main-section">
        <div className="container">
          {reviews.length === 0 ? (
            <div className="reviews-empty-box">
              <div className="google-icon-bubble">
                <svg viewBox="0 0 24 24" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </div>
              <h2 className="empty-h2">Review Mahadev Mechanical Car Garage on Google</h2>
              <p className="empty-p">
                Have you serviced your car with us? We appreciate your honest feedback! Google reviews help other car owners in Gohana find reliable, dealer-standard mechanical service.
              </p>
              <a 
                href={gmapsReviewUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-leave-review"
              >
                <span>Write a Google Review</span>
                <ExternalLink size={16} />
              </a>
            </div>
          ) : (
            <div className="reviews-cards-grid">
              {reviews.map((rev, index) => (
                <div key={index} className="review-card-item">
                  <div className="review-stars-row">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill="#FBBF24" color="#FBBF24" />
                    ))}
                  </div>
                  <blockquote className="review-text">"{rev.comment}"</blockquote>
                  <div className="review-author-box">
                    <strong>{rev.author}</strong>
                    {rev.vehicle && <span className="review-vehicle">{rev.vehicle}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Booking CTA Bar */}
          <div className="reviews-cta-strip">
            <div>
              <h3>Ready for a Smooth Car Service Experience?</h3>
              <p>Book your service online or visit our workshop on the Gohana–Panipat Road.</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenBooking()}
              className="btn btn-primary"
            >
              <Calendar size={16} />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
