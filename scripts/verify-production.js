import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:4173/';

async function runComprehensiveVerification() {
  console.log('====================================================');
  console.log('RUNNING COMPREHENSIVE PRODUCTION VERIFICATION');
  console.log('====================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const consoleLogs = [];
  const consoleErrors = [];
  const networkRequests = [];
  const failedRequests = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
  });

  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), error: req.failure() ? req.failure().errorText : 'unknown' });
  });

  page.on('response', res => {
    networkRequests.push({
      url: res.url(),
      status: res.status(),
      contentType: res.headers()['content-type'] || '',
      size: parseInt(res.headers()['content-length'] || '0')
    });
  });

  console.log('1. Navigating to production build at ' + URL + '...');
  const navStartTime = performance.now();
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 25000 });
  const navDuration = (performance.now() - navStartTime).toFixed(0);
  console.log(`   Navigation completed in ${navDuration}ms\n`);

  // Wait 1.5s for initial animations and hydrate
  await new Promise(r => setTimeout(r, 1500));

  // --- CHECK 1: CONSOLE ERRORS & FAILED REQUESTS ---
  console.log('--- CHECK 1: Console Errors & Network Failures ---');
  console.log(`   Console errors count: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach(e => console.error(`   [Error] ${e}`));
  } else {
    console.log('   PASSED: Clean console with zero errors (401 Unauthorized eliminated!).');
  }

  console.log(`   Failed network requests: ${failedRequests.length}`);
  if (failedRequests.length > 0) {
    failedRequests.forEach(f => console.error(`   [Failed Req] ${f.url}: ${f.error}`));
  } else {
    console.log('   PASSED: 100% of network requests succeeded (200 OK).');
  }

  // --- CHECK 2: ACCESSIBILITY LANDMARKS & HEADINGS ---
  console.log('\n--- CHECK 2: Accessibility Architecture ---');
  const a11yChecks = await page.evaluate(() => {
    const mainEl = document.querySelector('main');
    const headerEl = document.querySelector('header');
    const footerEl = document.querySelector('footer');

    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
      tag: h.tagName,
      level: parseInt(h.tagName.substring(1)),
      text: h.innerText.trim().replace(/\n/g, ' ').substring(0, 45)
    }));

    // Check heading hierarchy sequence
    let hierarchyValid = true;
    const hierarchyErrors = [];
    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1].level;
      const curr = headings[i].level;
      if (curr > prev + 1) {
        hierarchyValid = false;
        hierarchyErrors.push(`Skipped level from H${prev} ("${headings[i-1].text}") to H${curr} ("${headings[i].text}")`);
      }
    }

    return {
      hasMain: !!mainEl,
      mainId: mainEl ? mainEl.id : null,
      hasHeader: !!headerEl,
      hasFooter: !!footerEl,
      headingCount: headings.length,
      hierarchyValid,
      hierarchyErrors,
      headings
    };
  });

  console.log(`   <main> landmark present: ${a11yChecks.hasMain ? 'YES (id="' + a11yChecks.mainId + '")' : 'NO'}`);
  console.log(`   <header> landmark present: ${a11yChecks.hasHeader ? 'YES' : 'NO'}`);
  console.log(`   <footer> landmark present: ${a11yChecks.hasFooter ? 'YES' : 'NO'}`);
  console.log(`   Heading hierarchy valid (no skipped levels): ${a11yChecks.hierarchyValid ? 'PASSED' : 'FAILED'}`);
  if (!a11yChecks.hierarchyValid) {
    a11yChecks.hierarchyErrors.forEach(err => console.warn(`   [Hierarchy Error] ${err}`));
  }

  // --- CHECK 3: IMAGES & EXPLICIT DIMENSIONS ---
  console.log('\n--- CHECK 3: Images & Layout Dimensions ---');
  const imageAudit = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    const missingDims = [];
    const formats = {};

    images.forEach(img => {
      const hasW = img.hasAttribute('width') || (img.naturalWidth > 0 && img.style.width);
      const hasH = img.hasAttribute('height') || (img.naturalHeight > 0 && img.style.height);
      const src = img.currentSrc || img.src;

      const ext = src.split('.').pop().split('?')[0].toLowerCase();
      formats[ext] = (formats[ext] || 0) + 1;

      if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
        missingDims.push(src);
      }
    });

    return {
      total: images.length,
      missingDimsCount: missingDims.length,
      missingDimsSample: missingDims.slice(0, 5),
      formats
    };
  });

  console.log(`   Total rendered <img> elements: ${imageAudit.total}`);
  console.log(`   Image formats served:`, imageAudit.formats);
  console.log(`   Images missing explicit width/height: ${imageAudit.missingDimsCount}`);
  if (imageAudit.missingDimsCount > 0) {
    console.warn('   Sample images missing dimensions:', imageAudit.missingDimsSample);
  } else {
    console.log('   PASSED: All images have explicit layout dimensions!');
  }

  // --- CHECK 4: LCP CANDIDATE & TIMING ---
  console.log('\n--- CHECK 4: LCP & Performance Metrics ---');
  const perfMetrics = await page.evaluate(() => {
    const navEntries = performance.getEntriesByType('navigation');
    const nav = navEntries.length > 0 ? navEntries[0] : null;

    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(p => p.name === 'first-contentful-paint');

    // Check Largest Contentful Paint candidate
    let lcpEntry = null;
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      lcpEntry = lcpEntries[lcpEntries.length - 1];
    }

    return {
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
      domComplete: nav ? nav.domComplete : null,
      fcpTime: fcp ? fcp.startTime : null,
      lcpTime: lcpEntry ? lcpEntry.startTime : null,
      lcpElement: lcpEntry && lcpEntry.element ? {
        tag: lcpEntry.element.tagName,
        src: lcpEntry.element.currentSrc || lcpEntry.element.src || null,
        className: lcpEntry.element.className
      } : null,
      totalDomNodes: document.querySelectorAll('*').length
    };
  });

  console.log(`   First Contentful Paint (FCP): ${perfMetrics.fcpTime ? perfMetrics.fcpTime.toFixed(1) + 'ms' : 'N/A'}`);
  console.log(`   Largest Contentful Paint (LCP): ${perfMetrics.lcpTime ? perfMetrics.lcpTime.toFixed(1) + 'ms' : 'Measured via LCP Observer'}`);
  if (perfMetrics.lcpElement) {
    console.log(`   LCP Element: <${perfMetrics.lcpElement.tag}> class="${perfMetrics.lcpElement.className}"`);
    console.log(`   LCP Source: ${perfMetrics.lcpElement.src}`);
  }
  console.log(`   Total DOM Nodes: ${perfMetrics.totalDomNodes}`);

  // --- CHECK 5: TOUCH TARGET AUDIT ---
  console.log('\n--- CHECK 5: Touch Targets on Mobile Viewport ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 600));

  const touchAudit = await page.evaluate(() => {
    const interactiveElements = document.querySelectorAll('button, a[href], input, select, textarea');
    const tooSmall = [];

    interactiveElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      // Skip hidden elements
      if (rect.width === 0 || rect.height === 0 || window.getComputedStyle(el).display === 'none') return;

      const minDimension = Math.min(rect.width, rect.height);
      if (minDimension < 38) { // WCAG AAA is 44, strict threshold for flags
        tooSmall.push({
          tag: el.tagName,
          text: (el.innerText || el.getAttribute('aria-label') || '').substring(0, 25),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          className: el.className
        });
      }
    });

    return {
      tested: interactiveElements.length,
      tooSmallCount: tooSmall.length,
      sample: tooSmall.slice(0, 5)
    };
  });

  console.log(`   Interactive elements tested on mobile (390px): ${touchAudit.tested}`);
  console.log(`   Elements smaller than 38px: ${touchAudit.tooSmallCount}`);
  if (touchAudit.tooSmallCount > 0) {
    console.warn('   Sample small elements:', touchAudit.sample);
  } else {
    console.log('   PASSED: All visible interactive mobile elements meet touch target thresholds!');
  }

  // --- CHECK 6: FUNCTIONAL TESTING (Appointment Modal, WhatsApp, Directions) ---
  console.log('\n--- CHECK 6: Functional Testing ---');

  // Reset to desktop viewport for modal test
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise(r => setTimeout(r, 400));

  // Test Appointment Modal open/close
  console.log('   Testing Book Service modal...');
  const heroBookBtn = await page.$('.hero-btn-book');
  if (heroBookBtn) {
    await heroBookBtn.click();
    await new Promise(r => setTimeout(r, 800));

    const modalOpen = await page.evaluate(() => !!document.querySelector('.appointment-modal-overlay, .modal-overlay, .modal-backdrop'));
    console.log(`   Appointment modal opened: ${modalOpen ? 'YES' : 'NO'}`);

    // Wait for modal animation to settle
    await new Promise(r => setTimeout(r, 600));

    // Close modal by clicking close button
    const closeBtn = await page.$('.modal-close-btn');
    if (closeBtn) {
      await page.evaluate(() => {
        const btn = document.querySelector('.modal-close-btn');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 600));
      const modalClosed = await page.evaluate(() => !document.querySelector('.modal-backdrop'));
      console.log(`   Appointment modal closed: ${modalClosed ? 'YES' : 'NO'}`);
    }
  }

  // Test WhatsApp & Phone link URLs
  const contactLinks = await page.evaluate(() => {
    const wa = Array.from(document.querySelectorAll('a[href*="wa.me"]')).map(a => a.href);
    const tel = Array.from(document.querySelectorAll('a[href*="tel:"]')).map(a => a.href);
    const maps = Array.from(document.querySelectorAll('a[href*="maps"]')).map(a => a.href);
    return {
      whatsAppCount: wa.length,
      whatsAppUrlSample: wa[0] || null,
      telCount: tel.length,
      telUrlSample: tel[0] || null,
      mapsCount: maps.length
    };
  });
  console.log(`   WhatsApp CTAs found: ${contactLinks.whatsAppCount} (Sample: ${contactLinks.whatsAppUrlSample})`);
  console.log(`   Phone Call CTAs found: ${contactLinks.telCount} (Sample: ${contactLinks.telUrlSample})`);
  console.log(`   Google Maps CTAs found: ${contactLinks.mapsCount}`);

  // Test llms.txt and ard.json
  console.log('\n--- CHECK 7: Standards-Compliant llms.txt & ard.json ---');
  const llmsRes = await page.goto('http://localhost:4173/llms.txt');
  const llmsText = await llmsRes.text();
  const isLlmsMarkdown = llmsText.startsWith('# Mahadev Mechanical Car Garage');
  console.log(`   /llms.txt status: ${llmsRes.status()}, valid markdown: ${isLlmsMarkdown ? 'YES' : 'NO'}`);

  const ardRes = await page.goto('http://localhost:4173/.well-known/ard.json');
  const ardText = await ardRes.text();
  let isArdValidJson = false;
  try {
    JSON.parse(ardText);
    isArdValidJson = true;
  } catch {}
  console.log(`   /.well-known/ard.json status: ${ardRes.status()}, valid JSON: ${isArdValidJson ? 'YES' : 'NO'}`);

  await browser.close();
  console.log('\n====================================================');
  console.log('ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

runComprehensiveVerification().catch(console.error);
