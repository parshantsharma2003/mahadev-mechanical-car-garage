import React from 'react';
import SEOHead from '../components/SEOHead';
import HeroSection from '../components/HeroSection';
import StatsBar from '../components/StatsBar';
import ServicesSection from '../components/ServicesSection';
import CarBrandsSection from '../components/CarBrandsSection';
import WhyChooseUs from '../components/WhyChooseUs';
import GalleryCarousel from '../components/GalleryCarousel';
import TestimonialsSection from '../components/TestimonialsSection';
import ConnectWithUsSection from '../components/ConnectWithUsSection';
import FaqSection from '../components/FaqSection';
import CtaBanner from '../components/CtaBanner';
import { ROUTES_METADATA, buildFAQSchema, COMMON_FAQS, BASE_URL } from '../config/seoData';

export default function HomePage({ onOpenBooking, onOpenVideo, onNavigate }) {
  const meta = ROUTES_METADATA["/"];
  const pageSchema = [buildFAQSchema(COMMON_FAQS)];

  return (
    <>
      <SEOHead
        title={meta.title}
        description={meta.metaDescription}
        canonicalPath="/"
        ogImage={`${BASE_URL}/images/scorpio-n-hero.webp`}
        schema={pageSchema}
        breadcrumbName="Home"
      />

      {/* Hero Section */}
      <HeroSection onOpenBooking={onOpenBooking} onNavigate={onNavigate} />

      {/* Stats Bar */}
      <StatsBar />

      {/* Services Section */}
      <ServicesSection onSelectService={(svc) => onOpenBooking(svc)} onNavigate={onNavigate} />

      {/* Car Brands Marquee */}
      <CarBrandsSection />

      {/* Why Choose Us */}
      <WhyChooseUs onOpenVideo={onOpenVideo} />

      {/* Gallery Showcase */}
      <GalleryCarousel onNavigate={onNavigate} />

      {/* Customer Reviews */}
      <TestimonialsSection onNavigate={onNavigate} />

      {/* Connect With Us */}
      <ConnectWithUsSection />

      {/* High-Intent FAQ Section */}
      <FaqSection />

      {/* Action CTA Banner */}
      <CtaBanner onOpenBooking={onOpenBooking} />
    </>
  );
}
