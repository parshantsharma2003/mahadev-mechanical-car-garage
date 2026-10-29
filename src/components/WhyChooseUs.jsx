import React from 'react';
import { Wrench, ShieldCheck, Clock, Play } from 'lucide-react';
import './WhyChooseUs.css';

export default function WhyChooseUs({ onOpenVideo }) {
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
            <img 
              src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1400&q=80" 
              alt="Automotive workshop equipment and mechanic servicing car" 
              className="why-us-bg-img"
            />
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

            {/* Right Column: Video Play Button */}
            <div className="why-us-video-col">
              <button 
                className="video-play-btn" 
                onClick={onOpenVideo}
                aria-label="Play Workshop Video Tour"
              >
                <div className="play-pulse-ring"></div>
                <div className="play-btn-circle">
                  <Play size={26} className="play-triangle" fill="#111827" />
                </div>
              </button>
              <span className="video-btn-label">Watch Workshop Tour</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
