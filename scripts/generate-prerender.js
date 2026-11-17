import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  BASE_URL, 
  ROUTES_METADATA, 
  DEDICATED_SERVICES, 
  COMMON_FAQS, 
  BUSINESS_NAP,
  buildAutoRepairSchema, 
  buildWebSiteSchema, 
  buildBreadcrumbSchema, 
  buildServiceSchema, 
  buildFAQSchema 
} from '../src/config/seoData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run npm run build first.');
  process.exit(1);
}

const templatePath = path.resolve(distDir, 'index.html');
const baseTemplate = fs.readFileSync(templatePath, 'utf-8');

console.log('Generating static prerendered HTML files for SEO and AI crawlability...');

// Helper to escape HTML text
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate static HTML for each route
const routesToPrerender = Object.keys(ROUTES_METADATA);

let count = 0;

for (const routePath of routesToPrerender) {
  const meta = ROUTES_METADATA[routePath];
  const isHome = routePath === '/';
  const cleanSlug = routePath.replace(/^\//, '');

  // 1. Build Page-Specific Schemas
  const schemas = [
    buildAutoRepairSchema(),
    buildWebSiteSchema(),
    buildBreadcrumbSchema(routePath, meta.breadcrumbName)
  ];

  let bodyContent = '';
  let ogImage = `${BASE_URL}/images/scorpio-n-hero.webp`;

  // Dedicated Service Page
  if (DEDICATED_SERVICES[cleanSlug]) {
    const svc = DEDICATED_SERVICES[cleanSlug];
    ogImage = `${BASE_URL}${svc.heroImage}`;
    schemas.push(buildServiceSchema(svc));
    if (svc.faqs) {
      schemas.push(buildFAQSchema(svc.faqs));
    }

    bodyContent = `
      <div class="prerendered-content">
        <nav aria-label="Breadcrumb">
          <p><a href="/">Home</a> &gt; <a href="/services">Services</a> &gt; <span>${escapeHtml(svc.h1)}</span></p>
        </nav>
        <header>
          <h1>${escapeHtml(svc.h1)}</h1>
          <p>${escapeHtml(svc.subheading)}</p>
          <p><strong>Starting Price:</strong> ${escapeHtml(svc.startingPrice)} | <strong>Location:</strong> Gohana–Panipat Road near JK Garden, Gohana, Haryana</p>
          <p><a href="tel:+918295669463">Call +91 82956 69463</a> | <a href="https://wa.me/918295669463">WhatsApp Booking</a></p>
        </header>
        <section>
          <h2>What This Service Includes</h2>
          <ul>
            ${svc.includes.map(inc => `<li>${escapeHtml(inc)}</li>`).join('\n')}
          </ul>
        </section>
        <section>
          <h2>When Your Vehicle Needs This</h2>
          <ul>
            ${svc.whenNeeded.map(w => `<li>${escapeHtml(w)}</li>`).join('\n')}
          </ul>
        </section>
        <section>
          <h2>Workshop Workflow & Equipment</h2>
          <p>${escapeHtml(svc.equipmentUsed)}</p>
          <ol>
            ${svc.process.map(p => `<li><strong>${escapeHtml(p.title)}:</strong> ${escapeHtml(p.desc)}</li>`).join('\n')}
          </ol>
        </section>
        <section>
          <h2>Frequently Asked Questions</h2>
          ${svc.faqs.map(f => `
            <div>
              <h3>${escapeHtml(f.question)}</h3>
              <p>${escapeHtml(f.answer)}</p>
            </div>
          `).join('\n')}
        </section>
      </div>
    `;
  } else if (routePath === '/services') {
    schemas.push(buildFAQSchema(COMMON_FAQS));
    bodyContent = `
      <div class="prerendered-content">
        <header>
          <h1>Complete Multi-Brand Car Services in Gohana</h1>
          <p>Mahadev Mechanical Car Garage provides dealer-standard mechanical service, Japanese-tech engine decarbonization, automated AC servicing, car detailing, and foam wash.</p>
          <p><strong>Starting Prices:</strong> Car washing from ₹150 | Automated AC service from ₹999 | Full service package from ₹3,499</p>
        </header>
        <section>
          <h2>Specialized Services in Gohana</h2>
          <ul>
            <li><a href="/car-service-gohana">Car Service in Gohana (Multi-brand Periodic Maintenance)</a></li>
            <li><a href="/car-washing-gohana">Car Washing in Gohana (Snow Foam & Steam Wash from ₹150)</a></li>
            <li><a href="/car-ac-service-gohana">Car AC Service in Gohana (Automated Gas Recharge from ₹999)</a></li>
            <li><a href="/car-detailing-gohana">Car Detailing in Gohana (Paint Compounding & Polish)</a></li>
            <li><a href="/car-interior-cleaning-gohana">Interior Car Cleaning in Gohana (Steam Sanitization)</a></li>
          </ul>
        </section>
      </div>
    `;
  } else if (routePath === '/about') {
    schemas.push(buildFAQSchema(COMMON_FAQS));
    bodyContent = `
      <div class="prerendered-content">
        <header>
          <h1>About Mahadev Mechanical Car Garage Gohana</h1>
          <p>Established in 2018 on the Gohana–Panipat Road near JK Garden, Gohana, Haryana. Multi-brand automotive workshop with genuine OEM spare parts and modern diagnostic equipment.</p>
        </header>
        <section>
          <h2>Our Workshop Facilities & Equipment</h2>
          <p>Equipped with Japanese-tech hydrogen decarbonizer, computerized automated AC recovery station, digital OBD-II scanners, and commercial snow foam wash bay.</p>
          <p>Address: Near JK Garden, Gohana–Panipat Road, Gohana, Haryana 131301. Phone: +91 82956 69463.</p>
        </section>
      </div>
    `;
  } else if (routePath === '/contact') {
    bodyContent = `
      <div class="prerendered-content">
        <header>
          <h1>Contact Mahadev Mechanical Car Garage</h1>
          <p>Verified Workshop Location: Near JK Garden, Gohana–Panipat Road, Gohana, Haryana 131301, India</p>
          <p>GPS Coordinates: 29.1471882, 76.716434</p>
          <p>Phone: <a href="tel:+918295669463">+91 82956 69463</a></p>
          <p>WhatsApp: <a href="https://wa.me/918295669463">+91 82956 69463</a></p>
          <p>Operating Hours: Monday – Saturday 09:00 AM – 07:30 PM | Sunday 10:00 AM – 04:00 PM (By Appointment)</p>
        </header>
      </div>
    `;
  } else if (routePath === '/gallery') {
    bodyContent = `
      <div class="prerendered-content">
        <header>
          <h1>Customer Vehicle Transformations Gallery</h1>
          <p>Real workshop photographs of car detailing, Japanese engine carbon cleaning, automated AC servicing, and snow foam washes in Gohana.</p>
        </header>
      </div>
    `;
  } else if (routePath === '/reviews' || routePath === '/happy-customers') {
    bodyContent = `
      <div class="prerendered-content">
        <header>
          <h1>Customer Reviews & Workshop Feedback</h1>
          <p>Read customer experiences and feedback for Mahadev Mechanical Car Garage on Gohana–Panipat Road, Gohana, Haryana.</p>
        </header>
      </div>
    `;
  } else if (isHome) {
    schemas.push(buildFAQSchema(COMMON_FAQS));
  }

  // 2. Format Structured Data scripts
  const schemaScripts = schemas
    .filter(Boolean)
    .map(s => `    <script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n');

  // 3. Assemble HTML by modifying baseTemplate
  let html = baseTemplate;

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(meta.title)}</title>`);

  // Replace Meta Description
  html = html.replace(/<meta name="description" content=".*?" \/>/s, `<meta name="description" content="${escapeHtml(meta.metaDescription)}" />`);

  // Replace Canonical Link
  html = html.replace(/<link rel="canonical" href=".*?" \/>/s, `<link rel="canonical" href="${meta.canonical}" />`);

  // Update or insert Open Graph tags
  const ogTags = `
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.metaDescription)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${meta.canonical}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:site_name" content="Mahadev Mechanical Car Garage" />
    <meta property="og:locale" content="en_IN" />
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.metaDescription)}" />
    <meta name="twitter:image" content="${ogImage}" />`;

  html = html.replace(/<!-- Open Graph for social sharing -->[\s\S]*?<!-- Google Fonts/s, `${ogTags}\n    \n    <!-- Google Fonts`);

  // Replace Structured Data in head
  html = html.replace(/<!-- Structured Data \(JSON-LD\)[\s\S]*?<\/script>/s, `<!-- Structured Data (JSON-LD) -->\n${schemaScripts}`);

  // Insert prerendered body content inside <div id="root"> if not empty
  if (bodyContent && !isHome) {
    html = html.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);
  }

  // Write out target HTML file
  if (isHome) {
    fs.writeFileSync(path.resolve(distDir, 'index.html'), html, 'utf-8');
    console.log(`✓ Prerendered: / (dist/index.html)`);
  } else {
    const targetDir = path.resolve(distDir, cleanSlug);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(path.resolve(targetDir, 'index.html'), html, 'utf-8');
    console.log(`✓ Prerendered: ${routePath} (dist/${cleanSlug}/index.html)`);
  }
  count++;
}

console.log(`\nSuccessfully prerendered ${count} static HTML routes with distinct metadata, canonicals, and Schema.org JSON-LD!`);
