import React, { useState } from 'react';
import { ChevronRight, Wrench, Calendar, Camera } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { ROUTES_METADATA, BASE_URL } from '../config/seoData';
import { useGarage } from '../context/GarageContext';
import './GalleryPage.css';

export default function GalleryPage({ onOpenBooking, onNavigate }) {
  const { data } = useGarage();
  const galleryItems = data.gallery || [];
  const meta = ROUTES_METADATA["/gallery"];

  const [activeFilter, setActiveFilter] = useState('All');

  const categories = ['All', ...new Set(galleryItems.map(item => item.category))];

  const filteredItems = activeFilter === 'All' 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeFilter);

  return (
    <div className="gallery-page">
      <SEOHead
        title={meta.title}
        description={meta.metaDescription}
        canonicalPath="/gallery"
        ogImage={`${BASE_URL}/images/car-detailing.webp`}
        breadcrumbName="Gallery"
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
              Workshop Gallery
            </li>
          </ol>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="gallery-hero-section">
        <div className="container">
          <div className="gallery-hero-content">
            <div className="service-hero-tag">
              <Camera size={14} />
              <span>Genuine Customer Vehicles • Gohana Bay</span>
            </div>
            <h1 className="gallery-hero-title">
              Customer Vehicle Transformations
            </h1>
            <p className="gallery-hero-sub">
              Browse actual photographs of customer vehicle servicing, multi-stage paint compounding, Japanese engine carbon cleaning, and snow foam washes completed at our Gohana workshop.
            </p>

            {/* Category Filter Pills */}
            <div className="gallery-filters-row">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveFilter(cat)}
                  className={`gallery-filter-pill ${activeFilter === cat ? 'is-active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Grid Section */}
      <main className="gallery-grid-section">
        <div className="container">
          <div className="gallery-photos-grid">
            {filteredItems.map((item) => (
              <figure key={item.id} className="gallery-photo-card">
                <div className="photo-box">
                  <picture>
                    <source srcSet={item.image} type="image/webp" />
                    <img 
                      src={item.image.replace('.webp', '.png')} 
                      alt={`${item.title} - Mahadev Mechanical Car Garage in Gohana`}
                      className="photo-img"
                      width="500"
                      height="375"
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                  <span className="photo-category-badge">{item.category}</span>
                </div>
                <figcaption className="photo-caption">
                  <h3 className="photo-title">{item.title}</h3>
                  <p className="photo-desc">{item.description}</p>
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Booking CTA Bar */}
          <div className="gallery-cta-bar">
            <div>
              <h3>Want your car to look and run like this?</h3>
              <p>Schedule a service or detailing session at our Gohana workshop.</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenBooking()}
              className="btn btn-primary gallery-book-btn"
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
