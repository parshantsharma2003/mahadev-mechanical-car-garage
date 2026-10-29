import React from 'react';
import { Phone, MapPin, MessageCircle } from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import './BottomBar.css';

export default function BottomBar() {
  const { data } = useGarage();
  const contact = data.contact;
  const whatsappUrl = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent('Hello Mahadev Mechanical Car Garage, I would like to book an appointment for my car service.')}`;
  const phoneUrl = `tel:+91${contact.phone}`;
  const directionsUrl = contact.googleMapsDirectionsUrl;

  return (
    <div className="bottom-bar-fixed" role="region" aria-label="Quick Contact Bar">
      <div className="bottom-bar-container">
        {/* WhatsApp Button */}
        <a 
          href={whatsappUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="bottom-btn btn-whatsapp"
          aria-label="Chat with Mahadev Garage on WhatsApp"
        >
          <MessageCircle size={19} className="bottom-icon" />
          <span>WhatsApp</span>
        </a>

        {/* Call Now Button */}
        <a 
          href={phoneUrl} 
          className="bottom-btn btn-call"
          aria-label={`Call Mahadev Garage at ${contact.phoneDisplay || contact.phone}`}
        >
          <Phone size={19} className="bottom-icon" />
          <span>Call Now</span>
        </a>

        {/* Get Directions Button */}
        <a 
          href={directionsUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="bottom-btn btn-directions"
          aria-label="Get Google Maps Directions to Mahadev Garage"
        >
          <MapPin size={19} className="bottom-icon icon-directions" />
          <span>Get Directions</span>
        </a>
      </div>
    </div>
  );
}
