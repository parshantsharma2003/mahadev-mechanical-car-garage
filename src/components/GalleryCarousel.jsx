import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  X, 
  Grid 
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import './GalleryCarousel.css';

export default function GalleryCarousel() {
  const { data } = useGarage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoScrollEnabled] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [lightboxList, setLightboxList] = useState([]);

  // "View All Images" Modal State
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const carouselRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);
  const isMouseDownRef = useRef(false);

  const galleryItems = data.gallery || [];
  
  // Show only 10 fixed images on the main home page cards as requested
  const homeItems = galleryItems.slice(0, 10);

  // Extract unique categories for "View All" modal filter
  const categories = ['All', ...new Set(galleryItems.map(item => item.category).filter(Boolean))];

  const filteredAllItems = selectedCategory === 'All'
    ? galleryItems
    : galleryItems.filter(item => item.category === selectedCategory);

  const scrollToItem = (index) => {
    if (!carouselRef.current) return;
    const track = carouselRef.current;
    const cards = track.querySelectorAll('.gallery-card');
    if (cards[index]) {
      const card = cards[index];
      const targetLeft = card.offsetLeft - track.offsetLeft;
      track.scrollTo({
        left: targetLeft,
        behavior: 'smooth'
      });
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      const nextIndex = prev === 0 ? homeItems.length - 1 : prev - 1;
      scrollToItem(nextIndex);
      return nextIndex;
    });
  };

  const handleNext = () => {
    setCurrentIndex((prev) => {
      const nextIndex = prev >= homeItems.length - 1 ? 0 : prev + 1;
      scrollToItem(nextIndex);
      return nextIndex;
    });
  };

  const handleLightboxPrev = () => {
    setLightboxIndex((prev) => (prev === 0 ? lightboxList.length - 1 : prev - 1));
  };

  const handleLightboxNext = () => {
    setLightboxIndex((prev) => (prev >= lightboxList.length - 1 ? 0 : prev + 1));
  };

  // Open Lightbox for specific list (home vs all)
  const openLightbox = (index, list) => {
    setLightboxList(list);
    setLightboxIndex(index);
  };

  // Auto-scroll loop for home carousel
  useEffect(() => {
    if (!autoScrollEnabled || isHovered || isAllModalOpen || lightboxIndex !== null) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev >= homeItems.length - 1 ? 0 : prev + 1;
        scrollToItem(nextIndex);
        return nextIndex;
      });
    }, 4200);

    return () => clearInterval(interval);
  }, [autoScrollEnabled, isHovered, isAllModalOpen, lightboxIndex, homeItems.length]);

  // Lock background scroll when modals are open
  useEffect(() => {
    if (lightboxIndex !== null || isAllModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, isAllModalOpen]);

  // Keyboard navigation for Lightbox and Modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex !== null) {
        if (e.key === 'Escape') {
          setLightboxIndex(null);
        } else if (e.key === 'ArrowLeft') {
          setLightboxIndex((prev) => (prev === 0 ? lightboxList.length - 1 : prev - 1));
        } else if (e.key === 'ArrowRight') {
          setLightboxIndex((prev) => (prev >= lightboxList.length - 1 ? 0 : prev + 1));
        }
      } else if (isAllModalOpen && e.key === 'Escape') {
        setIsAllModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, isAllModalOpen, lightboxList.length]);

  // Touch Swipe Handlers for Home Carousel
  const handleTouchStart = (e) => {
    setIsHovered(true);
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
    setTimeout(() => setIsHovered(false), 2500);
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e) => {
    isMouseDownRef.current = true;
    setIsHovered(true);
    touchStartXRef.current = e.clientX;
  };

  const handleMouseMove = (e) => {
    if (!isMouseDownRef.current) return;
    touchEndXRef.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    setTimeout(() => setIsHovered(false), 2500);
  };

  const currentLightboxItem = lightboxIndex !== null && lightboxList[lightboxIndex]
    ? lightboxList[lightboxIndex]
    : null;

  return (
    <section id="gallery" className="gallery-section">
      <div className="container">
        {/* Section Header */}
        <div className="section-tag-wrapper">
          <div className="section-tag-line"></div>
          <span className="section-tag-text">WORKSHOP SHOWCASE</span>
        </div>

        <div className="gallery-header-row">
          <div>
            <h2 className="gallery-title">
              Latest Work from Our Garage
            </h2>
            <p className="gallery-subtitle">
              Authentic workshop transformations, machinery setups & precision repairs
            </p>
          </div>
        </div>

        {/* Gallery Carousel Track - ONLY FULL PICTURE CARDS, NO WORDS ON IMAGE */}
        <div 
          className="gallery-carousel-wrapper"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div className="gallery-track" ref={carouselRef}>
            {homeItems.map((item, idx) => (
              <div 
                key={item.id} 
                className={`gallery-card ${idx === currentIndex ? 'active-gallery-card' : ''}`}
                onClick={() => openLightbox(idx, homeItems)}
                role="button"
                tabIndex={0}
                aria-label={`Open photo of ${item.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(idx, homeItems);
                  }
                }}
              >
                {/* Pure Photo Card: ONLY full picture, zero text/captions */}
                <div className="gallery-image-box">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="gallery-img" 
                    loading="lazy" 
                    draggable="false"
                  />
                  {/* Elegant Expand Icon on Hover */}
                  <div className="gallery-hover-overlay">
                    <div className="gallery-expand-cue">
                      <Maximize2 size={18} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Banner to View All Images */}
        <div className="gallery-bottom-strip">
          <span className="gallery-strip-text">
            Showing 10 featured showcase photos. Want to see more mechanical overhauls?
          </span>
          <button 
            className="gallery-strip-btn"
            onClick={() => setIsAllModalOpen(true)}
          >
            <Grid size={15} />
            <span>Browse All {galleryItems.length} Photos ➔</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          FULL VIEW LIGHTBOX MODAL WITH FULL PICTURE, TITLE & DESCRIPTION
          ========================================================================= */}
      {currentLightboxItem && (
        <div 
          className="lightbox-backdrop" 
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Full Image View"
        >
          <div className="lightbox-modal" onClick={(e) => e.stopPropagation()}>
            {/* Top Bar with Badges, Counter & Close */}
            <div className="lightbox-top-bar">
              <div className="lightbox-meta-tag">
                <span className="lightbox-category-badge">{currentLightboxItem.category}</span>
                <span className="lightbox-counter">
                  Photo {lightboxIndex + 1} of {lightboxList.length}
                </span>
              </div>
              <button 
                className="lightbox-close-btn" 
                onClick={() => setLightboxIndex(null)}
                aria-label="Close full view"
              >
                <X size={20} />
              </button>
            </div>

            {/* Large Responsive Image Stage */}
            <div className="lightbox-img-stage">
              <img 
                src={currentLightboxItem.image} 
                alt={currentLightboxItem.title} 
                className="lightbox-full-img" 
              />
              
              {/* Prev / Next Image Controls */}
              {lightboxList.length > 1 && (
                <>
                  <button 
                    className="lightbox-nav-arrow lightbox-arrow-prev"
                    onClick={handleLightboxPrev}
                    aria-label="Previous image"
                    title="Previous (Left Arrow)"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    className="lightbox-nav-arrow lightbox-arrow-next"
                    onClick={handleLightboxNext}
                    aria-label="Next image"
                    title="Next (Right Arrow)"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {/* Description & Title Box (Shown ONLY in Full View as requested) */}
            <div className="lightbox-details-box">
              <h3 className="lightbox-title">{currentLightboxItem.title}</h3>
              <p className="lightbox-desc">{currentLightboxItem.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW ALL IMAGES MODAL / OVERLAY (ALL WORKSHOP PHOTOS)
          ========================================================================= */}
      {isAllModalOpen && (
        <div 
          className="all-gallery-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="All Workshop Photos Gallery"
        >
          <div className="all-gallery-container">
            {/* Header */}
            <div className="all-gallery-header">
              <div>
                <div className="section-tag-wrapper">
                  <div className="section-tag-line"></div>
                  <span className="section-tag-text">FULL GALLERY</span>
                </div>
                <h2 className="all-gallery-title">All Workshop Photos ({galleryItems.length})</h2>
                <p className="all-gallery-sub">
                  Click on any photo to view in high definition with complete details & description.
                </p>
              </div>
              <button 
                className="all-gallery-close-btn"
                onClick={() => setIsAllModalOpen(false)}
                aria-label="Close all photos view"
              >
                <X size={22} />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="all-gallery-filters">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`all-filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                  <span className="pill-count">
                    {cat === 'All' 
                      ? galleryItems.length 
                      : galleryItems.filter(item => item.category === cat).length}
                  </span>
                </button>
              ))}
            </div>

            {/* All Photos Grid - Pure Full Picture Cards */}
            <div className="all-gallery-grid">
              {filteredAllItems.map((item, idx) => (
                <div 
                  key={item.id}
                  className="all-grid-card"
                  onClick={() => openLightbox(idx, filteredAllItems)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open photo of ${item.title}`}
                >
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="all-grid-img" 
                    loading="lazy" 
                  />
                  <div className="all-grid-hover">
                    <div className="all-grid-zoom-cue">
                      <Maximize2 size={18} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
