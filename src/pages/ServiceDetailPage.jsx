import React from 'react';
import { 
  CheckCircle2, 
  Calendar, 
  Phone, 
  MessageCircle, 
  AlertCircle, 
  ArrowRight, 
  Wrench, 
  MapPin, 
  ChevronRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import SEOHead from '../components/SEOHead';
import FaqSection from '../components/FaqSection';
import { buildServiceSchema, buildFAQSchema, BASE_URL } from '../config/seoData';
import './ServiceDetailPage.css';

export default function ServiceDetailPage({ service, onOpenBooking, onNavigate }) {
  if (!service) return null;

  const phoneUrl = "tel:+918295669463";
  const whatsappUrl = `https://wa.me/918295669463?text=${encodeURIComponent(
    `Hello Mahadev Mechanical Car Garage, I am inquiring about ${service.h1} in Gohana.`
  )}`;

  const pageSchema = [
    buildServiceSchema(service),
    buildFAQSchema(service.faqs)
  ];

  return (
    <div className="service-detail-page">
      <SEOHead
        title={service.title}
        description={service.metaDescription}
        canonicalPath={service.path}
        ogImage={`${BASE_URL}${service.heroImage}`}
        schema={pageSchema}
        breadcrumbName={service.breadcrumbName || service.h1}
      />

      {/* Breadcrumb Navigation */}
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
            <li className="breadcrumb-item">
              <a 
                href="/services" 
                onClick={(e) => { e.preventDefault(); onNavigate('/services'); }}
                className="breadcrumb-link"
              >
                Services
              </a>
            </li>
            <ChevronRight size={14} className="breadcrumb-sep" aria-hidden="true" />
            <li className="breadcrumb-item active" aria-current="page">
              {service.h1}
            </li>
          </ol>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="service-hero-header">
        <div className="container">
          <div className="service-hero-grid">
            <div className="service-hero-text">
              <div className="service-hero-tag">
                <MapPin size={14} />
                <span>Gohana, Haryana • Workshop Bay</span>
              </div>
              <h1 className="service-hero-h1">{service.h1}</h1>
              <p className="service-hero-sub">{service.subheading}</p>

              {/* Price & Guarantee Badge */}
              <div className="service-price-pill-row">
                <div className="service-price-tag">
                  <span className="price-label">Starting Price:</span>
                  <span className="price-val">{service.startingPrice}</span>
                </div>
                <div className="service-guarantee-tag">
                  <ShieldCheck size={16} className="text-green" />
                  <span>100% Genuine Parts Guarantee</span>
                </div>
              </div>

              {/* Primary Call to Actions */}
              <div className="service-hero-actions">
                <button
                  type="button"
                  onClick={() => onOpenBooking(service.h1)}
                  className="btn btn-primary service-cta-book"
                >
                  <Calendar size={18} />
                  <span>Book This Service</span>
                  <ArrowRight size={16} />
                </button>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-outline service-cta-wa"
                >
                  <MessageCircle size={18} />
                  <span>WhatsApp Quote</span>
                </a>
                <a 
                  href={phoneUrl} 
                  className="btn btn-outline service-cta-call"
                  aria-label="Call +91 82956 69463"
                >
                  <Phone size={18} />
                  <span>Call Us</span>
                </a>
              </div>
            </div>

            {/* Service Hero Image */}
            <div className="service-hero-img-box">
              <picture>
                <source srcSet={service.heroImage} type="image/webp" />
                <img 
                  src={service.heroImage.replace('.webp', '.png')} 
                  alt={`${service.h1} at Mahadev Mechanical Car Garage in Gohana`}
                  className="service-detail-main-img"
                  width="600"
                  height="400"
                  loading="eager"
                  decoding="async"
                />
              </picture>
              <div className="service-img-caption">
                <Wrench size={15} />
                <span>Actual Workshop Facility • Near JK Garden, Gohana</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <div className="service-main-content">
        <div className="container">
          <div className="content-layout-grid">
            {/* Left Column: Details */}
            <div className="content-left-col">
              {/* Section 1: What is Included */}
              <section className="detail-section-card">
                <h2 className="section-h2">What This Service Includes</h2>
                <p className="section-subtext">
                  Complete breakdown of operations performed by our certified mechanics:
                </p>
                <ul className="service-checklist">
                  {service.includes.map((item, index) => (
                    <li key={index} className="checklist-item">
                      <CheckCircle2 size={18} className="check-icon text-red" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Section 2: Symptoms & When You Need It */}
              <section className="detail-section-card">
                <h2 className="section-h2">When Does Your Car Need This?</h2>
                <p className="section-subtext">
                  Key indicators that your vehicle is due for this service:
                </p>
                <div className="symptoms-grid">
                  {service.whenNeeded.map((symptom, index) => (
                    <div key={index} className="symptom-card">
                      <AlertCircle size={18} className="symptom-icon text-amber" />
                      <p className="symptom-desc">{symptom}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 3: 4-Step Process */}
              <section className="detail-section-card">
                <h2 className="section-h2">Our Step-by-Step Workshop Workflow</h2>
                <div className="process-timeline">
                  {service.process.map((step) => (
                    <div key={step.step} className="timeline-step">
                      <div className="step-number-bubble">{step.step}</div>
                      <div className="step-content">
                        <h3 className="step-title">{step.title}</h3>
                        <p className="step-desc">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 4: Workshop Equipment Confirmed */}
              <section className="detail-section-card equipment-card">
                <h2 className="section-h2">Dedicated Workshop Equipment Used</h2>
                <p className="equipment-desc">{service.equipmentUsed}</p>
                <div className="equipment-tag-row">
                  <span className="eq-tag">Japanese Technology</span>
                  <span className="eq-tag">Automated Equipment</span>
                  <span className="eq-tag">Calibrated Scan Tools</span>
                </div>
              </section>
            </div>

            {/* Right Column: Sticky Booking & Info Sidebar */}
            <aside className="content-right-sidebar">
              <div className="sticky-booking-card">
                <div className="sidebar-header">
                  <h3 className="sidebar-title">Book Service in Gohana</h3>
                  <p className="sidebar-sub">Direct booking with upfront quotes.</p>
                </div>

                <div className="sidebar-meta-list">
                  <div className="meta-item">
                    <span className="meta-label">Starting Price:</span>
                    <strong className="meta-val">{service.startingPrice}</strong>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Location:</span>
                    <span className="meta-val">Gohana–Panipat Rd</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Hours:</span>
                    <span className="meta-val">Mon - Sat: 9 AM - 7:30 PM</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenBooking(service.h1)}
                  className="btn btn-primary sidebar-book-btn"
                >
                  <Calendar size={18} />
                  <span>Book Appointment Now</span>
                </button>

                <div className="sidebar-contact-links">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="sidebar-wa-link">
                    <MessageCircle size={16} />
                    <span>Chat on WhatsApp</span>
                  </a>
                  <a href={phoneUrl} className="sidebar-call-link">
                    <Phone size={16} />
                    <span>Call +91 82956 69463</span>
                  </a>
                </div>

                <div className="sidebar-trust-box">
                  <div className="trust-row">
                    <Clock size={16} className="text-red" />
                    <span>Same-day turnaround for standard jobs</span>
                  </div>
                  <div className="trust-row">
                    <ShieldCheck size={16} className="text-green" />
                    <span>Genuine OEM/OES components</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Service-Specific FAQs */}
      <FaqSection 
        faqs={service.faqs}
        title={`${service.h1} — FAQs`}
        subtitle="Answers to common questions regarding this service at our Gohana workshop."
      />
    </div>
  );
}
