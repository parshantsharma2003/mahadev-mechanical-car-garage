import React from 'react';
import { X, Wrench, Shield, Zap } from 'lucide-react';
import './VideoModal.css';

export default function VideoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="video-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-header">
          <div>
            <h3 className="video-modal-title">Mahadev Mechanical Workshop Tour</h3>
            <p className="video-modal-sub">Gohana, Haryana • Precision Technology in Action</p>
          </div>
          <button className="video-close-btn" onClick={onClose} aria-label="Close video tour">
            <X size={22} />
          </button>
        </div>

        <div className="video-viewport">
          <img 
            src="https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=80" 
            alt="Mahadev Garage Workshop Machinery" 
            className="video-poster-img"
          />
          <div className="video-sim-overlay">
            <div className="video-hud-tag">
              <span className="live-dot"></span>
              <span>LIVE WORKSHOP BAY</span>
            </div>

            <div className="video-caption-box">
              <h4>Modern Automotive Repair Infrastructure</h4>
              <p>Equipped with hydraulic 4-post car lifts, Japanese hydrogen engine decarbonization stations, automated AC gas recyclers, and digital OBD-II diagnostic equipment.</p>
              
              <div className="video-specs-grid">
                <div className="spec-badge">
                  <Zap size={14} className="spec-icon" />
                  <span>Japanese Carbon Tech</span>
                </div>
                <div className="spec-badge">
                  <Wrench size={14} className="spec-icon" />
                  <span>Automated AC Machine</span>
                </div>
                <div className="spec-badge">
                  <Shield size={14} className="spec-icon" />
                  <span>100% Genuine Parts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
