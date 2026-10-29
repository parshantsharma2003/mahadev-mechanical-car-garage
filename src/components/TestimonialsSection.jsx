import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star, CheckCircle } from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import './TestimonialsSection.css';

const REVIEW_INTERVAL = 4500; // Changes every 4.5 seconds (4–5 seconds as requested)

export default function TestimonialsSection() {
  const { data } = useGarage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  const reviews = data.reviews || [];

  // Auto-rotate customer reviews every 4–5 seconds
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= reviews.length - 1 ? 0 : prev + 1));
    }, REVIEW_INTERVAL);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, reviews.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= reviews.length - 1 ? 0 : prev + 1));
  };

  // Mobile Swipe Handlers
  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    setTimeout(() => setIsPaused(false), 2000);
  };

  const currentReview = reviews[currentIndex] || reviews[0] || { comment: '', author: '', vehicle: '' };

  return (
    <section id="reviews" className="testimonials-section">
      <div className="container">
        {/* Section Header */}
        <div className="section-tag-wrapper">
          <div className="section-tag-line"></div>
          <span className="section-tag-text">HAPPY CUSTOMERS</span>
        </div>

        <h2 className="section-title testimonials-title">
          What Our Customers Say
        </h2>

        {/* Carousel Container */}
        <div 
          className="testimonials-carousel-wrapper"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Prev Button */}
          <button 
            className="carousel-nav-btn prev-btn" 
            onClick={handlePrev}
            aria-label="Previous Testimonial"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Testimonial Card with 4-5s auto-rotation */}
          <div className="testimonial-card">
            <div className="review-header-row">
              {/* Google G icon */}
              <div className="google-icon-wrapper">
                <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </div>

              {/* 5 Stars */}
              <div className="review-stars-row">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="#FBBF24" color="#FBBF24" />
                ))}
              </div>
            </div>

            {/* Review Comment */}
            <blockquote className="review-quote-text">
              "{currentReview.comment}"
            </blockquote>

            {/* Author info */}
            <div className="review-author-info">
              <span className="author-name">{currentReview.author}</span>
              <div className="author-meta">
                <span className="verified-badge">
                  <CheckCircle size={14} className="verified-icon" />
                  Verified Customer
                </span>
                <span className="meta-separator">•</span>
                <span className="author-car">{currentReview.vehicle}</span>
              </div>
            </div>

            {/* Indicator Dots */}
            <div className="carousel-dots">
              {reviews.map((_, idx) => (
                <button
                  key={idx}
                  className={`carousel-dot ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Next Button */}
          <button 
            className="carousel-nav-btn next-btn" 
            onClick={handleNext}
            aria-label="Next Testimonial"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>
    </section>
  );
}
