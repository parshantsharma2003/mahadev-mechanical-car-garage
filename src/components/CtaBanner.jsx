import React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import './CtaBanner.css';

export default function CtaBanner({ onOpenBooking }) {
  return (
    <section className="cta-banner-section">
      <div className="container">
        <div className="cta-card">
          <div className="cta-card-left">
            <div className="cta-calendar-box">
              <Calendar size={28} className="cta-calendar-icon" />
            </div>

            <div className="cta-text-content">
              <h2 className="cta-card-title">
                Ready to Give Your Car the Best Care?
              </h2>
              <p className="cta-card-desc">
                Book an appointment now and experience the difference.
              </p>
            </div>
          </div>

          <div className="cta-card-right">
            <button 
              className="btn btn-primary cta-action-btn"
              onClick={onOpenBooking}
            >
              <span>Book Now</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
