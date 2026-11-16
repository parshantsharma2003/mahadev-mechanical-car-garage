import React from 'react';
import { Wrench, ShieldCheck, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import './WhyChooseUs.css';

export default function WhyChooseUs() {
  const features = [
    {
      id: 1,
      icon: Wrench,
      title: "Modern Equipment",
      subtitle: "Japanese Technology",
      description: "Automated AC stations, hydrogen decarbonizers & computerized OBD-II scan tools."
    },
    {
      id: 2,
      icon: ShieldCheck,
      title: "Quality Service",
      subtitle: "Genuine Care for Your Vehicle",
      description: "100% genuine OEM/OES components and certified multi-grade synthetic oils."
    },
    {
      id: 3,
      icon: Clock,
      title: "On-Time Delivery",
      subtitle: "Your Time Matters",
      description: "Clear repair timelines with upfront price quotes and fast workshop turnaround."
    }
  ];

  return (
    <section id="why-us" className="why-us-section">
      <div className="container">
        <div className="why-us-card">
          {/* Background image & gradient overlay */}
          <div className="why-us-bg-wrapper">
            <picture>
              <source srcSet="/images/periodic-service.webp" type="image/webp" />
              <img 
                src="/images/periodic-service.jpg" 
                alt="Automotive workshop equipment and mechanic servicing car" 
                className="why-us-bg-img"
                width="900"
                height="506"
                loading="lazy"
                decoding="async"
              />
            </picture>
            <div className="why-us-overlay"></div>
          </div>

          <div className="why-us-content-grid">
            {/* Left Column: Feature Highlights */}
            <div className="why-us-features-col">
              {features.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div key={item.id} className="why-us-feature-row">
                    <div className="why-us-icon-wrap">
                      <IconComponent size={22} className="why-icon" />
                    </div>
                    <div className="why-us-text-wrap">
                      <h3 className="why-feature-title">{item.title}</h3>
                      <p className="why-feature-sub">{item.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Genuine Workshop Location Badge */}
            <div className="why-us-location-col">
              <div className="why-location-badge-box">
                <div className="why-badge-header">
                  <div className="why-badge-icon-wrap">
                    <MapPin size={20} className="why-badge-pin" />
                  </div>
                  <span className="why-badge-status">
                    <CheckCircle2 size={13} className="why-status-check" />
                    Verified Bay
                  </span>
                </div>
                <h3 className="why-location-title">Workshop Bay</h3>
                <p className="why-location-address">
                  Near JK Garden, Gohana–Panipat Rd,<br />
                  Gohana, Haryana 131301
                </p>
                <div className="why-location-hours">
                  <span>Mon – Sat: 9:00 AM – 7:30 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
