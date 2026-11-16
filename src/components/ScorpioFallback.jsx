import React from 'react';

// Lightweight Static Vehicle Fallback & Initial Loading Placeholder (Persistent LCP Anchor)
export default function ScorpioFallback() {
  return (
    <div className="scorpio-fallback-wrapper" aria-label="Black Mahindra Scorpio-N in dark garage studio">
      <picture>
        <source 
          media="(max-width: 640px)" 
          srcSet="/images/scorpio-n-hero-sm.webp" 
          type="image/webp" 
        />
        <source 
          srcSet="/images/scorpio-n-hero.webp" 
          type="image/webp" 
        />
        <img
          src="/images/scorpio-n-hero.png"
          alt="Glossy Black Mahindra Scorpio-N SUV showcase at Mahadev Mechanical Car Garage Gohana"
          className="scorpio-fallback-img"
          width="1200"
          height="670"
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />
      </picture>
      <div className="scorpio-fallback-glow" aria-hidden="true" />
    </div>
  );
}
