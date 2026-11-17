import React from 'react';
import { 
  ShieldCheck, 
  Wrench, 
  Clock, 
  MapPin, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  Award
} from 'lucide-react';
import SEOHead from '../components/SEOHead';
import FaqSection from '../components/FaqSection';
import { ROUTES_METADATA, BUSINESS_NAP, BASE_URL } from '../config/seoData';
import './AboutPage.css';

export default function AboutPage({ onOpenBooking, onNavigate }) {
  const meta = ROUTES_METADATA["/about"];

  const facilityHighlights = [
    {
      title: "Japanese Hydrogen Decarbonizer",
      desc: "In-chassis engine carbon cleaning equipment that safely cleans intake valves and combustion chambers without dismantling your engine."
    },
    {
      title: "Automated AC Recovery & Recharge Station",
      desc: "Computerized recovery, vacuum dehydration, leak testing, and exact-gram R134a refrigerant charging."
    },
    {
      title: "Computerized OBD-II Diagnostic Scanners",
      desc: "Live ECU telemetry diagnostics for check engine warnings, sensor health, and electrical trouble codes."
    },
    {
      title: "Pneumatic Snow Foam & Underbody Lifts",
      desc: "High-pressure multi-stage vehicle wash bay for scratch-free snow foam washing and thorough chassis mud flush."
    }
  ];

  return (
    <div className="about-page">
      <SEOHead
        title={meta.title}
        description={meta.metaDescription}
        canonicalPath="/about"
        ogImage={`${BASE_URL}/images/periodic-service.webp`}
        breadcrumbName="About Us"
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
              About Us
            </li>
          </ol>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="about-hero-section">
        <div className="container">
          <div className="about-hero-grid">
            <div className="about-hero-text">
              <div className="service-hero-tag">
                <MapPin size={14} />
                <span>Established 2018 • Gohana, Haryana</span>
              </div>
              <h1 className="about-hero-title">
                Honest, Multi-Brand Car Care in Gohana
              </h1>
              <p className="about-hero-sub">
                Mahadev Mechanical Car Garage was founded with a singular commitment: delivering dealer-standard mechanical workmanship, cutting-edge diagnostic equipment, and genuine spare parts without dealer markups.
              </p>

              <div className="about-stats-strip">
                <div className="about-stat-box">
                  <strong className="stat-number">2018</strong>
                  <span className="stat-label">Serving Gohana Since</span>
                </div>
                <div className="about-stat-box">
                  <strong className="stat-number">100%</strong>
                  <span className="stat-label">Genuine OEM/OES Parts</span>
                </div>
                <div className="about-stat-box">
                  <strong className="stat-number">Multi-Brand</strong>
                  <span className="stat-label">Passenger Vehicles</span>
                </div>
              </div>
            </div>

            <div className="about-hero-media">
              <picture>
                <source srcSet="/images/periodic-service.webp" type="image/webp" />
                <img 
                  src="/images/periodic-service.png" 
                  alt="Mechanic servicing customer vehicle at Mahadev Mechanical Car Garage in Gohana"
                  className="about-main-img"
                  width="600"
                  height="400"
                  loading="eager"
                  decoding="async"
                />
              </picture>
              <div className="about-media-tag">
                <Wrench size={16} />
                <span>Workshop Bay • Near JK Garden, Gohana–Panipat Rd</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Workshop Facilities & Commitment */}
      <main className="about-main-section">
        <div className="container">
          {/* Identity & Story */}
          <div className="about-story-card">
            <h2 className="about-section-h2">Our Workshop Identity</h2>
            <p className="about-p">
              Located on the bustling Gohana–Panipat Road near JK Garden, Mahadev Mechanical Car Garage serves car owners from Gohana, Panipat Chungi, Rohtak Gate, and neighboring villages across Sonipat district. We cater to hatchback, sedan, and SUV models from all major manufacturers, including Maruti Suzuki, Hyundai, Tata Motors, Mahindra, Toyota, Honda, Kia, and Skoda.
            </p>
            <p className="about-p">
              Rather than traditional trial-and-error repairs, our garage relies on precision scan tools, computerized diagnostic equipment, and transparent digital job cards so customers understand exactly what work is needed before any repair begins.
            </p>
          </div>

          {/* Real Equipment & Capabilities */}
          <section className="about-facilities-section">
            <h2 className="about-section-h2 text-center">Actual Workshop Equipment</h2>
            <p className="about-sub text-center">
              Our workshop is equipped with dedicated automotive stations designed for precision and reliability:
            </p>

            <div className="facilities-grid">
              {facilityHighlights.map((facility, index) => (
                <div key={index} className="facility-card">
                  <div className="facility-icon-wrap">
                    <Wrench size={20} className="text-red" />
                  </div>
                  <h3 className="facility-title">{facility.title}</h3>
                  <p className="facility-desc">{facility.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Genuine Spare Parts Policy */}
          <div className="about-parts-banner">
            <div className="parts-banner-content">
              <ShieldCheck size={36} className="text-green flex-shrink-0" />
              <div>
                <h3 className="parts-h3">Our 100% Genuine Parts Guarantee</h3>
                <p className="parts-p">
                  We never compromise on component reliability. All replacement filters, synthetic engine oils, brake pads, suspension bushes, and belts are sourced from certified OEM and OES distributors matching your vehicle's factory specifications.
                </p>
              </div>
            </div>
          </div>

          {/* Location & Contact Direct CTA */}
          <div className="about-visit-card">
            <div className="visit-text">
              <h3 className="visit-h3">Visit Our Workshop in Gohana</h3>
              <p className="visit-p">
                Open Monday – Saturday from 9:00 AM to 7:30 PM. Sunday open by appointment.
              </p>
              <p className="visit-address">
                <MapPin size={16} className="text-red" />
                <span>Near JK Garden, Gohana–Panipat Road, Gohana, Haryana 131301</span>
              </p>
            </div>
            <div className="visit-actions">
              <button
                type="button"
                onClick={() => onOpenBooking()}
                className="btn btn-primary visit-btn"
              >
                Book Appointment
              </button>
              <a 
                href="tel:+918295669463" 
                className="btn btn-outline visit-btn"
                aria-label="Call +91 82956 69463"
              >
                <Phone size={16} />
                <span>Call +91 82956 69463</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* FAQ Section */}
      <FaqSection />
    </div>
  );
}
