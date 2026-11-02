import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle2, MessageCircle, HelpCircle, AlertCircle } from 'lucide-react';
import { getWhatsAppBookingUrl } from '../config/garageData';
import { useGarage } from '../context/GarageContext';
import { bookPublicAppointment, submitPublicEnquiry, generateUUIDv4 } from '../utils/api';
import './AppointmentModal.css';

const getDefaultAppointmentDate = () => {
  const tomorrow = new Date(Date.now() + 86400000);
  return tomorrow.toISOString().split('T')[0];
};

export default function AppointmentModal({ isOpen, onClose, initialService }) {
  const { data, addBooking } = useGarage();
  const [activeTab, setActiveTab] = useState('booking');

  const getInitialBookingState = () => ({
    name: '',
    phone: '',
    service: initialService?.title || 'General Car Service',
    brand: 'Maruti Suzuki',
    model: '',
    registrationNumber: '',
    date: getDefaultAppointmentDate(),
    timeSlot: 'Morning (09:00 AM - 12:00 PM)',
    notes: ''
  });

  const getInitialEnquiryState = () => ({
    name: '',
    phone: '',
    subject: initialService?.title ? `Enquiry about ${initialService.title}` : 'Workshop Service Enquiry',
    preferredContactMethod: 'PHONE',
    message: ''
  });

  // Booking Form State
  const [formData, setFormData] = useState(getInitialBookingState);

  // Enquiry Form State
  const [enquiryData, setEnquiryData] = useState(getInitialEnquiryState);

  // Idempotency Key (retained across retries of the same submission)
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateUUIDv4());


  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [registrationConflict, setRegistrationConflict] = useState(false);
  const [enquiryConfirmed, setEnquiryConfirmed] = useState(false);
  const [enquiryTicket, setEnquiryTicket] = useState('');

  // Keep track of service selection changes
  const [lastInitialServiceTitle, setLastInitialServiceTitle] = useState(initialService?.title);
  if (initialService?.title && initialService.title !== lastInitialServiceTitle) {
    setLastInitialServiceTitle(initialService.title);
    setFormData((prev) => ({ ...prev, service: initialService.title }));
    setEnquiryData((prev) => ({
      ...prev,
      subject: `Enquiry about ${initialService.title}`
    }));
    if (initialService?.mode === 'enquiry') {
      setActiveTab('enquiry');
    }
  }

  // Refresh idempotency key whenever modal is freshly opened
  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(generateUUIDv4());
      setErrorMessage('');
      if (initialService?.mode === 'enquiry') {
        setActiveTab('enquiry');
      }
    }
  }, [isOpen, initialService]);

  if (!isOpen) return null;

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleEnquiryChange = (e) => {
    const { name, value } = e.target;
    setEnquiryData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleWhatsAppBooking = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      setErrorMessage('Please enter your name and phone number.');
      return;
    }

    const whatsappUrl = getWhatsAppBookingUrl({
      service: formData.service,
      carModel: `${formData.brand} ${formData.model}${formData.registrationNumber ? ` (${formData.registrationNumber})` : ''}`.trim(),
      date: `${formData.date} (${formData.timeSlot})`,
      name: `${formData.name} (Phone: ${formData.phone})`
    });
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  const handleOnlineBooking = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name || formData.name.trim().length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 characters).');
      return;
    }
    if (!formData.phone || formData.phone.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!formData.model || formData.model.trim().length < 1) {
      setErrorMessage('Please specify your car model.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await bookPublicAppointment(
        {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          brand: formData.brand.trim(),
          model: formData.model.trim(),
          registrationNumber: formData.registrationNumber.trim() || undefined,
          service: formData.service,
          preferredDate: formData.date,
          preferredTimeSlot: formData.timeSlot,
          problemDescription: formData.notes.trim() || undefined
        },
        idempotencyKey
      );

      const returnedBookingRef = response.data?.bookingReference || 'MHG-' + Math.floor(1000 + Math.random() * 9000);
      setBookingId(returnedBookingRef);
      setRegistrationConflict(Boolean(response.data?.registrationConflict));

      // Synchronize in-memory garage context for immediate local administrative visibility
      addBooking({
        id: returnedBookingRef,
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
      // Cleanly reset form state for next booking while preserving confirmation view
      setFormData(getInitialBookingState());
      // Ready a fresh key for any subsequent submission
      setIdempotencyKey(generateUUIDv4());
    } catch (err) {
      console.error('Online booking error:', err);
      setErrorMessage(err.message || 'Unable to record appointment slot. Please check your network and retry.');
      // NOTE: formData and idempotencyKey are intentionally preserved for seamless user retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!enquiryData.name || enquiryData.name.trim().length < 2) {
      setErrorMessage('Please enter your name.');
      return;
    }
    if (!enquiryData.phone || enquiryData.phone.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!enquiryData.message || enquiryData.message.trim().length < 5) {
      setErrorMessage('Please enter an enquiry message (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitPublicEnquiry(
        {
          name: enquiryData.name.trim(),
          phone: enquiryData.phone.trim(),
          subject: enquiryData.subject.trim(),
          message: enquiryData.message.trim(),
          preferredContactMethod: enquiryData.preferredContactMethod
        },
        idempotencyKey
      );

      const ticket = response.data?.ticketNumber || 'ENQ-' + Math.floor(1000 + Math.random() * 9000);
      setEnquiryTicket(ticket);
      setEnquiryConfirmed(true);
      setEnquiryData(getInitialEnquiryState());
      setIdempotencyKey(generateUUIDv4());
    } catch (err) {
      console.error('Enquiry submission error:', err);
      setErrorMessage(err.message || 'Unable to submit enquiry. Please check your connection and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setBookingConfirmed(false);
    setEnquiryConfirmed(false);
    setErrorMessage('');
    setFormData(getInitialBookingState());
    setEnquiryData(getInitialEnquiryState());
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h3 className="modal-title">
              {bookingConfirmed
                ? 'Booking Confirmed!'
                : enquiryConfirmed
                ? 'Enquiry Submitted!'
                : activeTab === 'booking'
                ? 'Book Workshop Appointment'
                : 'Ask Our Garage Mechanics'}
            </h3>
            <p className="modal-subtitle">
              {bookingConfirmed || enquiryConfirmed
                ? 'Your request has been successfully recorded in our system'
                : activeTab === 'booking'
                ? 'Fast check-in & priority service bay assignment'
                : 'Free expert advice, quote inquiries & mechanical guidance'}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        {/* Modal Tab Switch (Only shown before confirmation) */}
        {!bookingConfirmed && !enquiryConfirmed && (
          <div className="modal-tabs">
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === 'booking' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('booking');
                setErrorMessage('');
              }}
            >
              <Calendar size={15} />
              <span>Book Service Slot</span>
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === 'enquiry' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('enquiry');
                setErrorMessage('');
              }}
            >
              <HelpCircle size={15} />
              <span>General Enquiry</span>
            </button>
          </div>
        )}

        {/* ----------------- BOOKING SUCCESS VIEW ----------------- */}
        {bookingConfirmed && (
          <div className="booking-success-box">
            <div className="success-icon-wrap">
              <CheckCircle2 size={54} className="success-icon" />
            </div>
            <h4 className="success-heading">Appointment Confirmed!</h4>
            <p className="success-text">
              Thank you, <strong>{formData.name}</strong>. Your service booking reference is:
            </p>
            <div className="booking-badge">{bookingId}</div>

            {registrationConflict && (
              <div className="modal-conflict-note mb-3">
                <strong>Notice:</strong> Your vehicle plate is currently flagged for ownership verification by our front desk. Your service slot remains reserved.
              </div>
            )}

            <div className="success-details-card">
              <div className="success-row">
                <span>Service:</span>
                <strong>{formData.service}</strong>
              </div>
              <div className="success-row">
                <span>Vehicle:</span>
                <strong>{formData.brand} {formData.model} {formData.registrationNumber ? `(${formData.registrationNumber})` : ''}</strong>
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
        )}

        {/* ----------------- ENQUIRY SUCCESS VIEW ----------------- */}
        {enquiryConfirmed && (
          <div className="booking-success-box">
            <div className="success-icon-wrap">
              <CheckCircle2 size={54} className="success-icon" />
            </div>
            <h4 className="success-heading">Enquiry Received!</h4>
            <p className="success-text">
              Thank you, <strong>{enquiryData.name}</strong>. Your enquiry ticket number is:
            </p>
            <div className="booking-badge">{enquiryTicket}</div>

            <p className="success-text mb-4">
              Our workshop supervisor will contact you via <strong>{enquiryData.preferredContactMethod}</strong> at <strong>{enquiryData.phone}</strong> shortly.
            </p>

            <div className="success-actions">
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleReset}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ----------------- TAB 1: APPOINTMENT BOOKING FORM ----------------- */}
        {!bookingConfirmed && !enquiryConfirmed && activeTab === 'booking' && (
          <form className="modal-form" onSubmit={handleOnlineBooking}>
            {errorMessage && (
              <div className="modal-error-alert">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="form-grid">
              {/* Service Selection */}
              <div className="form-group full-width">
                <label className="form-label">Select Service</label>
                <select
                  name="service"
                  value={formData.service}
                  onChange={handleBookingChange}
                  className="form-input form-select"
                >
                  {(data.services || []).map((s) => (
                    <option key={s.id || s._id} value={s.title}>{s.title}</option>
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
                  onChange={handleBookingChange}
                  className="form-input form-select"
                >
                  {(data.carBrands || [
                    'Maruti Suzuki',
                    'Hyundai',
                    'Tata',
                    'Mahindra',
                    'Kia',
                    'Toyota',
                    'Honda',
                    'Volkswagen',
                    'Skoda'
                  ]).map((b) => (
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
                  placeholder="e.g. Swift / Creta / Scorpio-N"
                  value={formData.model}
                  onChange={handleBookingChange}
                  className="form-input"
                  required
                />
              </div>

              {/* Vehicle Registration Number */}
              <div className="form-group full-width">
                <label className="form-label">Vehicle Registration Number (Optional)</label>
                <input
                  type="text"
                  name="registrationNumber"
                  placeholder="e.g. HR 11 AB 1234"
                  value={formData.registrationNumber}
                  onChange={handleBookingChange}
                  className="form-input"
                  maxLength={15}
                />
              </div>

              {/* Preferred Date */}
              <div className="form-group">
                <label className="form-label">Preferred Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={handleBookingChange}
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
                  onChange={handleBookingChange}
                  className="form-input form-select"
                >
                  <option value="Morning (09:00 AM - 12:00 PM)">Morning (09:00 AM - 12:00 PM)</option>
                  <option value="Afternoon (12:00 PM - 03:00 PM)">Afternoon (12:00 PM - 03:00 PM)</option>
                  <option value="Evening (03:00 PM - 07:00 PM)">Evening (03:00 PM - 07:00 PM)</option>
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
                  onChange={handleBookingChange}
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
                  placeholder="10-digit Indian phone number"
                  value={formData.phone}
                  onChange={handleBookingChange}
                  className="form-input"
                  required
                />
              </div>

              {/* Problem Description Notes */}
              <div className="form-group full-width">
                <label className="form-label">Specific Car Issue or Notes (Optional)</label>
                <textarea
                  name="notes"
                  placeholder="e.g. Engine oil replacement, strange AC noise, or brake squeal"
                  value={formData.notes}
                  onChange={handleBookingChange}
                  className="form-input form-textarea"
                  rows={2}
                  maxLength={500}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-cta-buttons">
              <button
                type="button"
                onClick={handleWhatsAppBooking}
                disabled={isSubmitting}
                className="btn btn-whatsapp modal-wa-btn"
              >
                <MessageCircle size={18} />
                <span>Book via WhatsApp</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary modal-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Reserving Slot...</span>
                  </>
                ) : (
                  <>
                    <Calendar size={18} />
                    <span>Confirm Online Slot</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ----------------- TAB 2: ENQUIRY FORM ----------------- */}
        {!bookingConfirmed && !enquiryConfirmed && activeTab === 'enquiry' && (
          <form className="modal-form" onSubmit={handleEnquirySubmit}>
            {errorMessage && (
              <div className="modal-error-alert">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="form-grid">
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">Your Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Sunil Dahiya"
                  value={enquiryData.name}
                  onChange={handleEnquiryChange}
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
                  placeholder="10-digit Indian mobile"
                  value={enquiryData.phone}
                  onChange={handleEnquiryChange}
                  className="form-input"
                  required
                />
              </div>

              {/* Subject */}
              <div className="form-group full-width">
                <label className="form-label">Topic / Service Context</label>
                <input
                  type="text"
                  name="subject"
                  placeholder="e.g. Japanese Engine Carbon Cleaning Quote"
                  value={enquiryData.subject}
                  onChange={handleEnquiryChange}
                  className="form-input"
                  required
                />
              </div>

              {/* Preferred Contact Method */}
              <div className="form-group full-width">
                <label className="form-label">How would you like us to respond?</label>
                <select
                  name="preferredContactMethod"
                  value={enquiryData.preferredContactMethod}
                  onChange={handleEnquiryChange}
                  className="form-input form-select"
                >
                  <option value="PHONE">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp Message</option>
                  <option value="ANY">Any / Either</option>
                </select>
              </div>

              {/* Enquiry Message */}
              <div className="form-group full-width">
                <label className="form-label">Your Question or Service Requirement</label>
                <textarea
                  name="message"
                  placeholder="Ask about service pricing, parts availability, decarbonization turnaround, or mechanic inspection..."
                  value={enquiryData.message}
                  onChange={handleEnquiryChange}
                  className="form-input form-textarea"
                  rows={4}
                  required
                  maxLength={1000}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-cta-buttons">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary modal-submit-btn"
                style={{ width: '100%' }}
              >
                {isSubmitting ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Sending Enquiry...</span>
                  </>
                ) : (
                  <>
                    <HelpCircle size={18} />
                    <span>Submit Question to Mechanics</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
