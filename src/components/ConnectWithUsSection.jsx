import React, { useState, useEffect, useRef } from 'react';
import { useGarage } from '../context/GarageContext';
import './ConnectWithUsSection.css';

export default function ConnectWithUsSection() {
  const { data } = useGarage();
  const contact = data.contact || {};
  const social = contact.social || {};

  const trackRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const animationFrameIdRef = useRef(null);
  const touchResumeTimerRef = useRef(null);

  const channels = [
    {
      id: 'youtube',
      name: 'YouTube',
      url: social.youtube || 'https://youtube.com/@mahadevgaragegohana?si=kZuT5kpBOgSfW0TX',
      icon: (
        <svg viewBox="0 0 32 32" width="32" height="32" className="connect-channel-icon" aria-hidden="true">
          <rect width="32" height="32" rx="9" fill="#FF0000" className="yt-bg" />
          <path d="M12.5 10L22 16L12.5 22V10Z" fill="white" className="yt-play" />
        </svg>
      )
    },
    {
      id: 'instagram',
      name: 'Instagram',
      url: social.instagram || 'https://www.instagram.com/mahadevmechanical.gohana?obrf=MTVhNjQwNjVzbnE4cA==',
      icon: (
        <svg viewBox="0 0 32 32" width="32" height="32" className="connect-channel-icon" aria-hidden="true">
          <defs>
            <radialGradient id="connect-ig-grad" cx="20%" cy="115%" r="130%">
              <stop offset="0%" stopColor="#FFDD55" />
              <stop offset="20%" stopColor="#FF543E" />
              <stop offset="50%" stopColor="#C837AB" />
              <stop offset="100%" stopColor="#3771C8" />
            </radialGradient>
          </defs>
          <rect width="32" height="32" rx="9" fill="url(#connect-ig-grad)" className="ig-bg" />
          <rect x="6.5" y="6.5" width="19" height="19" rx="5.5" stroke="white" strokeWidth="2" fill="none" className="ig-lens-outer" />
          <circle cx="16" cy="16" r="4.6" stroke="white" strokeWidth="2" fill="none" className="ig-lens-inner" />
          <circle cx="21.2" cy="10.8" r="1.3" fill="white" className="ig-flash" />
        </svg>
      )
    },
    {
      id: 'facebook',
      name: 'Facebook',
      url: social.facebook || 'https://www.facebook.com/share/1G2yEuMHh9/',
      icon: (
        <svg viewBox="0 0 32 32" width="32" height="32" className="connect-channel-icon" aria-hidden="true">
          <circle cx="16" cy="16" r="16" fill="#1877F2" className="fb-bg" />
          <path d="M17.8 31V17.5H21.7L22.3 12.9H17.8V10C17.8 8.7 18.2 7.8 20.1 7.8H22.5V3.7C21.4 3.5 19.9 3.4 18.3 3.4C14.2 3.4 11.3 5.9 11.3 10.5V12.9H7.5V17.5H11.3V31H17.8Z" fill="white" className="fb-letter" />
        </svg>
      )
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      url: social.whatsapp || `https://wa.me/${contact.whatsapp || '918295669463'}`,
      icon: (
        <svg viewBox="0 0 32 32" width="32" height="32" className="connect-channel-icon" aria-hidden="true">
          <circle cx="16" cy="16" r="16" fill="#25D366" className="wa-bg" />
          <path d="M22.6 19.9C22.3 19.7 20.7 18.9 20.3 18.8C20 18.7 19.8 18.6 19.5 18.9C19.3 19.3 18.6 20.1 18.4 20.3C18.2 20.5 18 20.5 17.6 20.4C17.3 20.2 16.2 19.8 15 18.7C14 17.9 13.4 16.9 13.2 16.5C13 16.2 13.2 16 13.3 15.8C13.5 15.7 13.6 15.5 13.8 15.3C13.9 15.1 14 14.9 14.1 14.7C14.2 14.5 14.1 14.3 14 14.1C13.9 14 13.2 12.4 12.9 11.7C12.7 11.1 12.4 11.2 12.1 11.2C11.9 11.2 11.7 11.2 11.4 11.2C11.2 11.2 10.8 11.3 10.5 11.6C10.2 12 9.4 12.8 9.4 14.4C9.4 16 10.5 17.5 10.7 17.7C10.9 17.9 12.9 21.1 16.2 22.5C17 22.9 17.6 23.1 18 23.2C18.8 23.5 19.5 23.4 20.1 23.3C20.8 23.2 22.1 22.5 22.4 21.7C22.7 20.9 22.7 20.2 22.6 20.1C22.5 20 22.3 19.9 22.6 19.9Z" fill="white" className="wa-phone" />
        </svg>
      )
    },
    {
      id: 'google-maps',
      name: 'Google Maps',
      url: social.googleMaps || contact.googleMapsDirectionsUrl,
      icon: (
        <svg viewBox="0 0 32 32" width="32" height="32" className="connect-channel-icon gmaps-icon-svg" aria-hidden="true">
          <path d="M16 2.5C10.9 2.5 6.8 6.6 6.8 11.7C6.8 17.9 14.5 27.6 15.1 28.4C15.6 29 16.4 29 16.9 28.4C17.5 27.6 25.2 17.9 25.2 11.7C25.2 6.6 21.1 2.5 16 2.5Z" fill="#EA4335" />
          <path d="M16 2.5C21.1 2.5 25.2 6.6 25.2 11.7C25.2 14.5 23.9 18.1 22.1 21.4L16 15.7V2.5Z" fill="#4285F4" />
          <path d="M16 28.4C16.1 28.6 16.3 28.7 16.5 28.8L22.1 21.4C20.1 24.9 17.4 27.9 16 29.5V28.4Z" fill="#34A853" />
          <path d="M9.9 21.4L16 15.7V2.5C10.9 2.5 6.8 6.6 6.8 11.7C6.8 15.2 8.2 18.7 9.9 21.4Z" fill="#FBBC05" />
          <circle cx="16" cy="11.2" r="3.7" fill="#FFFFFF" />
        </svg>
      )
    }
  ];

  // Tripled list for infinite seamless marquee loop on mobile view
  const mobileChannels = [...channels, ...channels, ...channels];

  // Continuous auto-scrolling loop ONLY active in mobile phone view (< 768px)
  useEffect(() => {
    const isMobileViewport = () => window.innerWidth < 768;

    const scrollStep = () => {
      if (isMobileViewport() && trackRef.current && !isPaused && !isDraggingRef.current) {
        trackRef.current.scrollLeft += 0.85;

        // Seamless loop reset when 1 complete set scrolls
        const { scrollLeft, scrollWidth } = trackRef.current;
        const setWidth = scrollWidth / 3;
        if (setWidth > 0) {
          if (scrollLeft >= setWidth) {
            trackRef.current.scrollLeft = scrollLeft - setWidth;
          } else if (scrollLeft <= 0) {
            trackRef.current.scrollLeft = setWidth;
          }
        }
      }
      animationFrameIdRef.current = requestAnimationFrame(scrollStep);
    };

    animationFrameIdRef.current = requestAnimationFrame(scrollStep);

    // On window resize, if switching to laptop (>=768px), keep scroll at 0 (static)
    const handleResize = () => {
      if (!isMobileViewport() && trackRef.current) {
        trackRef.current.scrollLeft = 0;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isPaused]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e) => {
    if (!trackRef.current || window.innerWidth >= 768) return;
    if (touchResumeTimerRef.current) clearTimeout(touchResumeTimerRef.current);
    setIsPaused(true);
    isDraggingRef.current = true;
    startXRef.current = e.touches[0].pageX - trackRef.current.offsetLeft;
    scrollLeftStartRef.current = trackRef.current.scrollLeft;
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || !trackRef.current || window.innerWidth >= 768) return;
    const x = e.touches[0].pageX - trackRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.35;
    trackRef.current.scrollLeft = scrollLeftStartRef.current - walk;
  };

  const handleTouchEnd = () => {
    if (window.innerWidth >= 768) return;
    isDraggingRef.current = false;
    touchResumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 2200);
  };

  return (
    <section className="connect-section" id="connect" aria-label="Connect With Us">
      <div className="container">
        {/* Eyebrow with flanking red lines */}
        <div className="connect-eyebrow-wrapper">
          <span className="connect-eyebrow-line" />
          <span className="connect-eyebrow-text">CONNECT WITH US</span>
          <span className="connect-eyebrow-line" />
        </div>

        {/* Heading: Follow Us for Updates & Offers */}
        <h2 className="connect-heading">
          Follow Us for <span className="text-highlight-red">Updates & Offers</span>
        </h2>

        {/* Main Connect Card: Static on Laptop, Continuous Auto-Scrolling on Mobile */}
        <div className="connect-card">
          <div 
            className="connect-channels-row" 
            ref={trackRef}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => {
              setIsPaused(false);
              isDraggingRef.current = false;
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {mobileChannels.map((channel, index) => {
              const isDuplicate = index >= channels.length;
              const isLastInSet = (index + 1) % channels.length === 0;

              return (
                <React.Fragment key={`${channel.id}-${index}`}>
                  <a
                    href={channel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`connect-channel-item channel-${channel.id} ${isDuplicate ? 'channel-duplicate' : ''}`}
                    title={`Connect with us on ${channel.name}`}
                    aria-label={channel.name}
                  >
                    <div className="connect-icon-box">
                      {channel.icon}
                    </div>
                    <span className="connect-channel-name">{channel.name}</span>
                  </a>

                  {/* Vertical Divider: on laptop only between original 5 items, on mobile after each item */}
                  <span 
                    className={`connect-divider ${isDuplicate ? 'divider-duplicate' : ''} ${isLastInSet ? 'divider-set-end' : ''}`} 
                    aria-hidden="true" 
                  />
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
