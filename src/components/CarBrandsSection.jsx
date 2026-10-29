import React, { useState, useEffect, useRef } from 'react';
import './CarBrandsSection.css';

const CAR_BRANDS = [
  { id: 'maruti-suzuki', name: 'Maruti Suzuki', logo: '/images/brands/maruti-suzuki.svg' },
  { id: 'hyundai', name: 'Hyundai', logo: '/images/brands/hyundai.svg' },
  { id: 'toyota', name: 'Toyota', logo: '/images/brands/toyota.svg' },
  { id: 'tata', name: 'Tata', logo: '/images/brands/tata.svg' },
  { id: 'honda', name: 'Honda', logo: '/images/brands/honda.svg' },
  { id: 'mahindra', name: 'Mahindra', logo: '/images/brands/mahindra.png' },
  { id: 'kia', name: 'Kia', logo: '/images/brands/kia.svg' },
  { id: 'ford', name: 'Ford', logo: '/images/brands/ford.svg' },
  { id: 'renault', name: 'Renault', logo: '/images/brands/renault.svg' },
  { id: 'nissan', name: 'Nissan', logo: '/images/brands/nissan.svg' },
  { id: 'skoda', name: 'Skoda', logo: '/images/brands/skoda.svg' },
  { id: 'volkswagen', name: 'Volkswagen', logo: '/images/brands/volkswagen.svg' }
];

export default function CarBrandsSection() {
  const trackRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  // Dragging & Swipe state refs
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const animationFrameIdRef = useRef(null);

  // Duplicate items for infinite seamless scroll
  const displayBrands = [...CAR_BRANDS, ...CAR_BRANDS];

  // Seamless scroll loop reset on manual drag or continuous scroll
  const handleScroll = () => {
    if (!trackRef.current) return;
    const { scrollLeft, scrollWidth } = trackRef.current;
    const halfScroll = scrollWidth / 2;
    if (halfScroll > 0) {
      if (scrollLeft >= halfScroll) {
        trackRef.current.scrollLeft = scrollLeft - halfScroll;
      } else if (scrollLeft <= 0 && isDraggingRef.current) {
        // If dragged before start
        trackRef.current.scrollLeft = halfScroll;
      }
    }
  };

  // Continuous smooth auto-scroll animation loop
  useEffect(() => {
    const scrollStep = () => {
      if (trackRef.current && !isPaused && !isDraggingRef.current) {
        trackRef.current.scrollLeft += 0.75;
      }
      animationFrameIdRef.current = requestAnimationFrame(scrollStep);
    };

    animationFrameIdRef.current = requestAnimationFrame(scrollStep);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isPaused]);


  // Mouse drag handlers
  const handleMouseDown = (e) => {
    if (!trackRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - trackRef.current.offsetLeft;
    scrollLeftStartRef.current = trackRef.current.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    trackRef.current.scrollLeft = scrollLeftStartRef.current - walk;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch swipe handlers with auto-scroll resume timer for smooth mobile UX
  const touchResumeTimerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (!trackRef.current) return;
    if (touchResumeTimerRef.current) clearTimeout(touchResumeTimerRef.current);
    setIsPaused(true);
    isDraggingRef.current = true;
    startXRef.current = e.touches[0].pageX - trackRef.current.offsetLeft;
    scrollLeftStartRef.current = trackRef.current.scrollLeft;
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || !trackRef.current) return;
    const x = e.touches[0].pageX - trackRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    trackRef.current.scrollLeft = scrollLeftStartRef.current - walk;
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchResumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 2500);
  };

  return (
    <section className="car-brands-section" id="car-brands" aria-label="Car Brands We Service">
      <div className="container brands-container">
        {/* Header Block Matching Reference */}
        <div className="brands-header-row">
          <div className="brands-title-col">
            <div className="brands-eyebrow">
              <span className="eyebrow-dash" />
              <span className="eyebrow-text">CAR BRANDS</span>
            </div>
            <h2 className="brands-heading">All Major Car Brands</h2>
          </div>

          <div className="brands-right-col">
            <p className="brands-description">
              We service and maintain all popular car brands with expert care and genuine quality.
            </p>
          </div>
        </div>

        {/* Carousel Outer Container with fixed intrinsic height */}
        <div
          className="brands-carousel-container"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => {
            setIsPaused(false);
            isDraggingRef.current = false;
          }}
        >
          {/* Scrollable Track */}
          <div
            className="brands-carousel-track"
            ref={trackRef}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {displayBrands.map((brand, idx) => (
              <div
                key={`${brand.id}-${idx}`}
                className="brand-card"
                title={`${brand.name} Service & Repairs`}
              >
                <div className="car-brand-logo-frame">
                  <img
                    src={brand.logo}
                    alt={`${brand.name} logo`}
                    className="car-brand-logo-img"
                    loading="lazy"
                    draggable="false"
                  />
                </div>
                <span className="brand-name-label">{brand.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
