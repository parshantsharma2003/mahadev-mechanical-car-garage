import puppeteer from 'puppeteer-core';

async function diagnoseCanvas() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log(`[PAGE LOG ${msg.type()}]`, msg.text()));
    page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));

    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });

    await new Promise(r => setTimeout(r, 3000));

    const state = await page.evaluate(() => {
      const canvas = document.querySelector('.scorpio-three-canvas');
      const fallback = document.querySelector('.scorpio-fallback-wrapper');
      return {
        hasCanvas: !!canvas,
        hasFallback: !!fallback,
        innerHTML: document.querySelector('.hero-3d-visual-col')?.innerHTML
      };
    });

    console.log('State in .hero-3d-visual-col:');
    console.log('hasCanvas:', state.hasCanvas);
    console.log('hasFallback:', state.hasFallback);

  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    await browser.close();
  }
}

diagnoseCanvas();
