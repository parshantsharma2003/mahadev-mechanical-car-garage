import React from 'react';
import { 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  Wrench, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  ChevronRight,
  Phone,
  MessageCircle
} from 'lucide-react';
import SEOHead from '../components/SEOHead';
import FaqSection from '../components/FaqSection';
import { ROUTES_METADATA, DEDICATED_SERVICES, BASE_URL } from '../config/seoData';
import { useGarage } from '../context/GarageContext';
import './ServicesPage.css';

export default function ServicesPage({ onOpenBooking, onNavigate }) {
  const { data } = useGarage();
  const meta = ROUTES_METADATA["/services"];
  const services = data.services || [];

  const serviceSlugMap = {
    "general-car-service": "/car-service-gohana",
    "car-washing": "/car-washing-gohana",
    "car-detailing": "/car-detailing-gohana",
    "ac-servicing": "/car-ac-service-gohana",
    "interior-cleaning": "/car-interior-cleaning-gohana"
  };

  return (
    <div className="services-index-page">
      <SEOHead
        title={meta.title}
        description={meta.metaDescription}
        canonicalPath="/services"
        ogImage={`${BASE_URL}/images/periodic-service.webp`}
        breadcrumbName="Services"
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
              Services
            </li>
          </ol>
        </div>
      </nav>

      {/* Header */}
      <header className="services-page-hero">
        <div className="container">
          <div className="services-hero-content">
            <div className="service-hero-tag">
              <MapPin size={14} />
              <span>Gohana Workshop Bay • All Passenger Vehicles</span>
            </div>
            <h1 className="services-hero-title">
              Complete Multi-Brand Car Care in Gohana
            </h1>
            <p className="services-hero-sub">
              From periodic oil servicing and Japanese-technology engine decarbonization to automated AC diagnostics, snow foam washing, and deep interior detailing. 100% genuine parts and upfront transparent estimates.
            </p>

            {/* Quick Pricing Summary Banner */}
            <div className="services-pricing-strip">
              <div className="pricing-strip-item">
                <span className="strip-title">Car Washing</span>
                <span className="strip-price">From ₹150</span>
              </div>
              <div className="pricing-strip-divider" />
              <div className="pricing-strip-item">
                <span className="strip-title">Automated AC Service</span>
                <span className="strip-price">From ₹999</span>
              </div>
              <div className="pricing-strip-divider" />
              <div className="pricing-strip-item">
                <span className="strip-title">Full Service Package</span>
                <span className="strip-price">From ₹3,499</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Services Grid */}
      <main className="services-grid-section">
        <div className="container">
          <div className="services-grid-header">
            <h2 className="grid-section-h2">Explore Our Specialized Service Bays</h2>
            <p className="grid-section-sub">
              Click any service for detailed process workflows, equipment specifications, symptoms, and transparent pricing.
            </p>
          </div>

          <div className="services-cards-grid">
            {services.map((svc) => {
              const dedicatedPath = serviceSlugMap[svc.id] || null;

              return (
                <article key={svc.id} className="service-card-item">
                  <div className="card-media-box">
                    <picture>
                      <source srcSet={svc.image} type="image/webp" />
                      <img 
                        src={svc.image.replace('.webp', '.png')} 
                        alt={`${svc.title} at Mahadev Mechanical Car Garage in Gohana`}
                        className="card-media-img"
                        width="400"
                        height="240"
                        loading="lazy"
                        decoding="async"
                      />
                    </picture>
                    <span className="card-badge">{svc.tag}</span>
                  </div>

                  <div className="card-content-box">
                    <h3 className="card-title">{svc.title}</h3>
                    <p className="card-desc">{svc.fullDesc || svc.shortDesc}</p>

                    <div className="card-highlights-list">
                      {svc.highlights.map((hl, i) => (
                        <div key={i} className="highlight-pill">
                          <CheckCircle2 size={13} className="text-red" />
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>

                    <div className="card-actions-bar">
                      {dedicatedPath ? (
                        <a 
                          href={dedicatedPath}
                          onClick={(e) => { e.preventDefault(); onNavigate(dedicatedPath); }}
                          className="btn-read-more"
                        >
                          <span>Service Details & Pricing</span>
                          <ArrowRight size={14} />
                        </a>
                      ) : (
                        <span className="text-muted text-xs">Direct Workshop Bay Service</span>
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenBooking(svc.title)}
                        className="btn-card-book"
                        aria-label={`Book ${svc.title}`}
                      >
                        <Calendar size={15} />
                        <span>Book</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Workshop Standards Strip */}
          <div className="workshop-standards-banner">
            <div className="standard-item">
              <ShieldCheck size={24} className="text-red" />
              <div>
                <strong>100% Genuine Spare Parts</strong>
                <p>Authentic OEM/OES components for all car brands.</p>
              </div>
            </div>
            <div className="standard-item">
              <Wrench size={24} className="text-red" />
              <div>
                <strong>Modern Diagnostic Equipment</strong>
                <p>Japanese carbon cleaning and automated AC recovery station.</p>
              </div>
            </div>
            <div className="standard-item">
              <Sparkles size={24} className="text-red" />
              <div>
                <strong>Upfront Transparent Quotes</strong>
                <p>Clear prices before work begins — no hidden surprises.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Services FAQ */}
      <FaqSection 
        title="Car Servicing & Maintenance — FAQs"
        subtitle="Common questions regarding car repairs, parts, turnaround times, and pricing in Gohana."
      />
    </div>
  );
}
