import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { COMMON_FAQS } from '../config/seoData';
import './FaqSection.css';

export default function FaqSection({ 
  faqs = COMMON_FAQS, 
  title = "Frequently Asked Questions",
  subtitle = "Direct, verified answers to common questions about car servicing, washing, AC repair, and pricing at our Gohana workshop."
}) {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFaq = (index) => {
    setOpenIndex(prev => (prev === index ? -1 : index));
  };

  return (
    <section className="faq-section" id="faq" aria-labelledby="faq-heading">
      <div className="container">
        {/* Section Header */}
        <div className="section-tag-wrapper">
          <div className="section-tag-line"></div>
          <span className="section-tag-text">HELP & ANSWERS</span>
        </div>

        <div className="faq-header-block">
          <h2 id="faq-heading" className="faq-main-title">{title}</h2>
          <p className="faq-main-subtitle">{subtitle}</p>
        </div>

        {/* Accordion List */}
        <div className="faq-accordion-list" role="region" aria-label="Frequently Asked Questions Accordion">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const headingId = `faq-q-${index}`;
            const panelId = `faq-a-${index}`;

            return (
              <div 
                key={index} 
                className={`faq-item-card ${isOpen ? 'is-expanded' : ''}`}
              >
                <h3>
                  <button
                    type="button"
                    id={headingId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="faq-question-btn"
                    onClick={() => toggleFaq(index)}
                  >
                    <span className="faq-question-text">
                      <HelpCircle size={18} className="faq-help-icon" aria-hidden="true" />
                      {faq.question}
                    </span>
                    <span className="faq-icon-pill" aria-hidden="true">
                      <ChevronDown size={18} className={`faq-chevron ${isOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headingId}
                  className={`faq-answer-panel ${isOpen ? 'panel-open' : 'panel-closed'}`}
                >
                  <div className="faq-answer-inner">
                    <p className="faq-answer-text">{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Assistance Callout */}
        <div className="faq-footer-callout">
          <p className="faq-callout-text">
            Have a specific mechanical question or need an estimate for your car model?
          </p>
          <div className="faq-callout-actions">
            <a 
              href="tel:+918295669463" 
              className="faq-callout-btn btn-call"
              aria-label="Call +91 82956 69463"
            >
              Call +91 82956 69463
            </a>
            <a 
              href="https://wa.me/918295669463?text=Hello%20Mahadev%20Mechanical%20Car%20Garage,%20I%20have%20a%20question%20regarding%20car%20service." 
              target="_blank" 
              rel="noopener noreferrer" 
              className="faq-callout-btn btn-wa"
              aria-label="Ask on WhatsApp"
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
