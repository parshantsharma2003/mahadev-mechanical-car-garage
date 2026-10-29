import React from 'react';
import { MapPin, Phone, MessageCircle, Clock, ShieldCheck, ChevronRight, Lock } from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import './Footer.css';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer({ onOpenBooking }) {
  const { data } = useGarage();
  const contact = data.contact;
  const services = data.services;

  const whatsappUrl = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent('Hello Mahadev Mechanical Car Garage, I would like to book an appointment for my car service.')}`;
  const phoneUrl = `tel:+91${contact.phone}`;
  const directionsUrl = contact.googleMapsDirectionsUrl;

  return (
    <footer id="contact" className="site-footer">
      <div className="container">
        {/* Main Footer Grid */}
        <div className="footer-grid">
          {/* Col 1: Garage Identity */}
          <div className="footer-col col-brand">
            <a href="#hero" className="footer-brand-logo mb-3" aria-label="Mahadev Mechanical Car Garage Home">
              <div className="footer-logo-card">
                <img 
                  src="/images/logo.png" 
                  alt="Mahadev Mechanical Car Garage" 
                  className="footer-logo-img" 
                  width="160"
                  height="54"
                />
              </div>
            </a>
            
            <p className="footer-about-text">
              Gohana's modern multi-brand car workshop. Dealer-standard mechanical service, Japanese-tech engine decarbonization, foam wash, and automated AC servicing.
            </p>

            <div className="footer-trust-tag">
              <ShieldCheck size={18} className="shield-green" />
              <span>100% Genuine Spare Parts Guarantee</span>
            </div>
          </div>

          {/* Col 2: Services List */}
          <div className="footer-col">
            <h4 className="footer-col-title">Workshop Services</h4>
            <ul className="footer-links-list">
              {services.map((s) => (
                <li key={s.id}>
                  <a href="#services" className="footer-link">
                    <ChevronRight size={14} className="link-arrow" />
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Workshop Hours */}
          <div className="footer-col">
            <h4 className="footer-col-title">Operating Hours</h4>
            <div className="footer-hours-card">
              <div className="hours-row">
                <div className="hours-icon-col">
                  <Clock size={16} className="clock-red" />
                </div>
                <div>
                  <strong className="hours-day">Monday - Saturday</strong>
                  <p className="hours-val">09:00 AM - 07:30 PM</p>
                </div>
              </div>

              <div className="hours-row">
                <div className="hours-icon-col">
                  <Clock size={16} className="clock-red" />
                </div>
                <div>
                  <strong className="hours-day">Sunday</strong>
                  <p className="hours-val">10:00 AM - 04:00 PM <br /><span className="text-appointment">(By Appointment Only)</span></p>
                </div>
              </div>
            </div>

            <button 
              className="btn btn-outline-red footer-book-btn"
              onClick={onOpenBooking}
            >
              Book Priority Slot
            </button>
          </div>

          {/* Col 4: Address & Direct Contact */}
          <div className="footer-col col-contact">
            <h4 className="footer-col-title">Garage Location</h4>
            
            <div className="footer-contact-item">
              <MapPin size={20} className="contact-icon" />
              <div>
                <strong>Mahadev Mechanical Car Garage</strong>
                <p>Near Indian Oil Petrol Pump, Rohtak - Panipat Rd, Gohana, Haryana 131301</p>
                <a 
                  href={directionsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="directions-link"
                >
                  View on Google Maps ➔
                </a>
              </div>
            </div>

            <div className="footer-contact-item">
              <Phone size={20} className="contact-icon" />
              <div>
                <strong>Customer Helpline</strong>
                <a href={phoneUrl} className="phone-link">
                  {contact.phoneDisplay || contact.phone}
                </a>
              </div>
            </div>

            <div className="footer-contact-item">
              <MessageCircle size={20} className="contact-icon" />
              <div>
                <strong>WhatsApp Enquiries</strong>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="phone-link">
                  {contact.whatsappDisplay || contact.whatsapp}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <p className="copyright-text">
            © {CURRENT_YEAR} Mahadev Mechanical Car Garage. All rights reserved.
          </p>
          <div className="footer-bottom-tags">
            <span>Rohtak - Panipat Rd, Gohana, Haryana</span>
            <span>•</span>
            <a href="#admin" className="footer-admin-link">
              <Lock size={12} />
              <span>Admin Portal</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
