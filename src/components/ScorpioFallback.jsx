import React from 'react';

// Lightweight Static Vehicle Fallback & Initial Loading Placeholder
export default function ScorpioFallback() {
  return (
    <div className="scorpio-fallback-wrapper" aria-label="Black Mahindra Scorpio-N in dark garage studio">
      <img
        src="/images/scorpio-n-hero.png"
        alt="Glossy Black Mahindra Scorpio-N SUV"
        className="scorpio-fallback-img"
        loading="eager"
      />
      <div className="scorpio-fallback-glow" />
    </div>
  );
}
