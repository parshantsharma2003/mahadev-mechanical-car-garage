import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, MessageCircle } from 'lucide-react';
import { getWhatsAppBookingUrl } from '../config/garageData';
import { useGarage } from '../context/GarageContext';
import './AppointmentModal.css';

const getDefaultAppointmentDate = () => {
  const tomorrow = new Date(Date.now() + 86400000);
  return tomorrow.toISOString().split('T')[0];
};

export default function AppointmentModal({ isOpen, onClose, initialService }) {
  const { data, addBooking } = useGarage();
  const [formData, setFormData] = useState(() => ({
    name: '',
    phone: '',
    service: initialService?.title || 'General Car Service',
    brand: 'Maruti Suzuki',
    model: '',
    date: getDefaultAppointmentDate(),
    timeSlot: 'Morning (09:00 AM - 12:00 PM)',
    notes: ''
  }));

  const [lastInitialServiceTitle, setLastInitialServiceTitle] = useState(initialService?.title);
  if (initialService?.title && initialService.title !== lastInitialServiceTitle) {
    setLastInitialServiceTitle(initialService.title);
    setFormData((prev) => ({ ...prev, service: initialService.title }));
  }

  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleWhatsAppBooking = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Please enter your name and phone number.");
      return;
    }
    const randomId = 'MHG-' + Math.floor(1000 + Math.random() * 9000);
    // Log in admin system
    addBooking({
      id: randomId,
      name: formData.name,
      phone: formData.phone,
      service: formData.service,
      brand: formData.brand,
      model: formData.model,
      date: formData.date,
      timeSlot: formData.timeSlot,
      notes: formData.notes,
      source: 'WhatsApp',
      status: 'Pending',
      createdAt: new Date().toISOString()
    });

    const whatsappUrl = getWhatsAppBookingUrl({
      service: formData.service,
      carModel: `${formData.brand} ${formData.model}`.trim(),
      date: `${formData.date} (${formData.timeSlot})`,
      name: `${formData.name} (Phone: ${formData.phone})`
    });
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  const handleOnlineBooking = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Please enter your name and phone number.");
      return;
    }
    const randomId = 'MHG-' + Math.floor(1000 + Math.random() * 9000);
    setBookingId(randomId);

    // Save directly to Admin database/context
    addBooking({
      id: randomId,
      name: formData.name,
      phone: formData.phone,
      service: formData.service,
      brand: formData.brand,
      model: formData.model,
      date: formData.date,
      timeSlot: formData.timeSlot,
      notes: formData.notes,
      source: 'Website Online',
      status: 'Pending',
      createdAt: new Date().toISOString()
    });

    setBookingConfirmed(true);
  };

  const handleReset = () => {
    setBookingConfirmed(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h3 className="modal-title">
              {bookingConfirmed ? "Booking Confirmed!" : "Book Workshop Appointment"}
            </h3>
            <p className="modal-subtitle">
              {bookingConfirmed 
                ? "Your service slot request has been recorded" 
                : "Fast check-in & priority service bay assignment"}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        {bookingConfirmed ? (
          <div className="booking-success-box">
            <div className="success-icon-wrap">
              <CheckCircle2 size={54} className="success-icon" />
            </div>
            <h4 className="success-heading">Appointment Confirmed!</h4>
            <p className="success-text">
              Thank you, <strong>{formData.name}</strong>. Your service booking reference is:
            </p>
            <div className="booking-badge">{bookingId}</div>

            <div className="success-details-card">
              <div className="success-row">
                <span>Service:</span>
                <strong>{formData.service}</strong>
              </div>
              <div className="success-row">
                <span>Vehicle:</span>
                <strong>{formData.brand} {formData.model}</strong>
              </div>
              <div className="success-row">
                <span>Date & Time:</span>
                <strong>{formData.date} • {formData.timeSlot}</strong>
              </div>
              <div className="success-row">
                <span>Workshop:</span>
                <strong>Rohtak - Panipat Rd, Gohana</strong>
              </div>
            </div>

            <div className="success-actions">
              <button 
                className="btn btn-whatsapp success-wa-btn"
                onClick={handleWhatsAppBooking}
              >
                <MessageCircle size={18} />
                <span>Send to Garage WhatsApp</span>
              </button>
              <button 
                className="btn btn-outline"
                onClick={handleReset}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleOnlineBooking}>
            <div className="form-grid">
              {/* Service Selection */}
              <div className="form-group full-width">
                <label className="form-label">Select Service</label>
                <select 
                  name="service" 
                  value={formData.service} 
                  onChange={handleChange}
                  className="form-input form-select"
                >
                  {data.services.map((s) => (
                    <option key={s.id} value={s.title}>{s.title}</option>
                  ))}
                  <option value="Custom Inspection / Engine Diagnosis">Custom Inspection / Engine Diagnosis</option>
                </select>
              </div>

              {/* Car Brand */}
              <div className="form-group">
                <label className="form-label">Car Brand</label>
                <select 
                  name="brand" 
                  value={formData.brand} 
                  onChange={handleChange}
                  className="form-input form-select"
                >
                  {(data.carBrands || []).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Other">Other Make</option>
                </select>
              </div>

              {/* Car Model */}
              <div className="form-group">
                <label className="form-label">Car Model</label>
                <input 
                  type="text" 
                  name="model" 
                  placeholder="e.g. Swift / Creta / Nexon" 
                  value={formData.model}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              {/* Preferred Date */}
              <div className="form-group">
                <label className="form-label">Preferred Date</label>
                <input 
                  type="date" 
                  name="date" 
                  value={formData.date}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              {/* Time Slot */}
              <div className="form-group">
                <label className="form-label">Time Slot</label>
                <select 
                  name="timeSlot" 
                  value={formData.timeSlot} 
                  onChange={handleChange}
                  className="form-input form-select"
                >
                  <option value="Morning (09:00 AM - 12:00 PM)">Morning (09:00 AM - 12:00 PM)</option>
                  <option value="Afternoon (12:00 PM - 03:30 PM)">Afternoon (12:00 PM - 03:30 PM)</option>
                  <option value="Evening (03:30 PM - 07:00 PM)">Evening (03:30 PM - 07:00 PM)</option>
                </select>
              </div>

              {/* Customer Name */}
              <div className="form-group">
                <label className="form-label">Your Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  placeholder="e.g. Rahul Verma" 
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input 
                  type="tel" 
                  name="phone" 
                  placeholder="10-digit phone number" 
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-cta-buttons">
              <button 
                type="button" 
                onClick={handleWhatsAppBooking}
                className="btn btn-whatsapp modal-wa-btn"
              >
                <MessageCircle size={18} />
                <span>Book via WhatsApp</span>
              </button>

              <button 
                type="submit" 
                className="btn btn-primary modal-submit-btn"
              >
                <Calendar size={18} />
                <span>Confirm Online Slot</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
