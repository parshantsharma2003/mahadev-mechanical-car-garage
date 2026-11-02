import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import './ServicesSection.css';

export default function ServicesSection({ onSelectService }) {
  const { data } = useGarage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const carouselTrackRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const services = data.services;

  const scrollToItem = (index) => {
    if (!carouselTrackRef.current) return;
    const track = carouselTrackRef.current;
    const cards = track.querySelectorAll('.service-carousel-card');
    if (cards[index]) {
      const card = cards[index];
      // Horizontal-only container scroll: strictly prevents vertical document scrolling/jitter
      const targetLeft = card.offsetLeft - track.offsetLeft;
      track.scrollTo({
        left: targetLeft,
        behavior: 'smooth'
      });
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      const nextIndex = prev === 0 ? services.length - 1 : prev - 1;
      scrollToItem(nextIndex);
      return nextIndex;
    });
  };

  const handleNext = () => {
    setCurrentIndex((prev) => {
      const nextIndex = prev >= services.length - 1 ? 0 : prev + 1;
      scrollToItem(nextIndex);
      return nextIndex;
    });
  };

  // Slow auto-scroll timer: advances every 3.8s when not paused
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev >= services.length - 1 ? 0 : prev + 1;
        scrollToItem(nextIndex);
        return nextIndex;
      });
    }, 3800);

    return () => clearInterval(timer);
  }, [isPaused, services.length]);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diffX = touchStartXRef.current - touchEndXRef.current;
    const threshold = 45; // min swipe distance in px

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        // Swiped Left -> Go Next
        handleNext();
      } else {
        // Swiped Right -> Go Prev
        handlePrev();
      }
    }
    // Resume auto-scroll after a short delay
    setTimeout(() => setIsPaused(false), 2000);
  };

  // Mouse Drag Handlers for Desktop
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    setIsPaused(true);
    touchStartXRef.current = e.clientX;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    touchEndXRef.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const diffX = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) handleNext();
      else handlePrev();
    }
    setTimeout(() => setIsPaused(false), 2000);
  };

  return (
    <section id="services" className="services-section">
      <div className="container">
        {/* Section Header */}
        <div className="section-tag-wrapper">
          <div className="section-tag-line"></div>
          <span className="section-tag-text">OUR SERVICES</span>
        </div>

        <div className="services-header-row">
          <div>
            <h2 className="services-title">
              Professional Services <br className="mobile-only" />
              for Every Car Need
            </h2>
            <p className="services-subtitle">
              Dealer-grade maintenance, Japanese diagnostics & genuine OEM parts
            </p>
          </div>

          {/* Carousel Controls */}
          <div className="services-controls-group">
            <button 
              className="carousel-control-btn" 
              onClick={handlePrev}
              aria-label="Previous Service"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              className="carousel-control-btn" 
              onClick={handleNext}
              aria-label="Next Service"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Services Carousel Wrapper with Auto-Scroll & Manual Swipe */}
        <div 
          className="services-carousel-container"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div className="services-carousel-track" ref={carouselTrackRef}>
            {services.map((service, index) => (
              <div 
                key={service.id} 
                className={`service-carousel-card ${index === currentIndex ? 'active-card' : ''}`}
                onClick={() => onSelectService(service)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectService(service);
                  }
                }}
              >
                {/* Visual Image Header */}
                <div className="service-img-wrapper">
                  <img 
                    src={service.image} 
                    alt={service.title} 
                    className="service-img" 
                    loading="lazy"
                    draggable="false"
                  />
                  <div className="service-img-overlay" />
                  
                  {/* Top Badge */}
                  <div className="service-badges-bar">
                    <span className="service-tag-badge">
                      <span className="badge-glow-dot" />
                      {service.tag}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="service-card-body">
                  <h3 className="service-card-title">{service.title}</h3>
                  <p className="service-card-desc">{service.shortDesc}</p>

                  {/* Highlights Row */}
                  <div className="service-highlights-row">
                    {service.highlights.slice(0, 2).map((hl, idx) => (
                      <span key={idx} className="service-hl-pill">
                        <CheckCircle2 size={13} className="hl-check" />
                        <span className="hl-text">{hl}</span>
                      </span>
                    ))}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="service-card-footer">
                    <button 
                      type="button"
                      className="service-action-pill"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectService(service);
                      }}
                      aria-label={`Book ${service.title}`}
                    >
                      <span className="action-pill-text">Book Now</span>
                      <div className="action-pill-icon">
                        <ArrowRight size={15} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Carousel Progress Indicators / Dots */}
          <div className="services-dots-row">
            {services.map((_, idx) => (
              <button
                key={idx}
                className={`services-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  setCurrentIndex(idx);
                  scrollToItem(idx);
                }}
                aria-label={`Go to service ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Helper Bar */}
        <div className="services-bottom-banner">
          <div className="bottom-banner-text">
            <Sparkles size={18} className="sparkle-icon" />
            <span>Need an engine noise diagnosis or custom mechanical overhaul?</span>
          </div>
          <button 
            className="banner-enquire-link"
            onClick={() => onSelectService({ title: "Custom Inspection & Diagnostics", mode: "enquiry" })}
          >
            Ask Our Mechanics ➔
          </button>
        </div>
      </div>
    </section>
  );
}
