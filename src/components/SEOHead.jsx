import { useEffect } from 'react';
import { BASE_URL, buildAutoRepairSchema, buildWebSiteSchema, buildBreadcrumbSchema } from '../config/seoData';

/**
 * SEOHead - Dynamically synchronizes document head metadata and JSON-LD schemas
 */
export default function SEOHead({
  title,
  description,
  canonicalPath = '/',
  ogImage = `${BASE_URL}/images/scorpio-n-hero.webp`,
  ogType = 'website',
  schema = null,
  breadcrumbName = 'Home'
}) {
  useEffect(() => {
    // 1. Update Document Title
    if (title) {
      document.title = title;
    }

    // Helper to set or create a meta tag by name
    const setMetaByName = (name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Helper to set or create a meta tag by property (Open Graph)
    const setMetaByProperty = (property, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Meta Description
    if (description) {
      setMetaByName('description', description);
    }

    // 3. Canonical Link
    const cleanPath = canonicalPath === '/' ? '' : canonicalPath.replace(/\/$/, '');
    const canonicalUrl = `${BASE_URL}${cleanPath}`;
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    // 4. Open Graph Tags
    setMetaByProperty('og:title', title);
    setMetaByProperty('og:description', description);
    setMetaByProperty('og:url', canonicalUrl);
    setMetaByProperty('og:image', ogImage);
    setMetaByProperty('og:type', ogType);
    setMetaByProperty('og:site_name', 'Mahadev Mechanical Car Garage');
    setMetaByProperty('og:locale', 'en_IN');

    // 5. Twitter Card Tags
    setMetaByName('twitter:card', 'summary_large_image');
    setMetaByName('twitter:title', title);
    setMetaByName('twitter:description', description);
    setMetaByName('twitter:image', ogImage);

    // 6. JSON-LD Schemas injection
    // Collect all schemas to inject: Core AutoRepair, WebSite, Breadcrumbs, plus page-specific schema
    const schemasToInject = [
      buildAutoRepairSchema(),
      buildWebSiteSchema(),
      buildBreadcrumbSchema(cleanPath || '/', breadcrumbName)
    ];

    if (schema) {
      if (Array.isArray(schema)) {
        schemasToInject.push(...schema.filter(Boolean));
      } else {
        schemasToInject.push(schema);
      }
    }

    // Clean up previous dynamically injected JSON-LD scripts
    const existingDynamicScripts = document.querySelectorAll('script[data-dynamic-seo="true"]');
    existingDynamicScripts.forEach((script) => script.remove());

    // Inject updated structured data
    schemasToInject.forEach((schemaObj, index) => {
      if (!schemaObj) return;
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-dynamic-seo', 'true');
      script.setAttribute('data-schema-index', String(index));
      script.textContent = JSON.stringify(schemaObj);
      document.head.appendChild(script);
    });

    return () => {
      // Cleanup on unmount if needed
      const dynamicScripts = document.querySelectorAll('script[data-dynamic-seo="true"]');
      dynamicScripts.forEach((script) => script.remove());
    };
  }, [title, description, canonicalPath, ogImage, ogType, schema, breadcrumbName]);

  return null;
}
