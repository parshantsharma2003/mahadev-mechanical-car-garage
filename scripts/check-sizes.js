import puppeteer from 'puppeteer-core';

async function checkSizes() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const rects = await page.evaluate(() => {
    const viewport = document.querySelector('.scorpio-visual-viewport');
    const layer3d = document.querySelector('.hero-3d-layer');
    const wrapper = document.querySelector('.scorpio-canvas-wrapper');
    const canvas = document.querySelector('canvas');
    return {
      viewport: viewport ? viewport.getBoundingClientRect() : null,
      layer3d: layer3d ? layer3d.getBoundingClientRect() : null,
      wrapper: wrapper ? wrapper.getBoundingClientRect() : null,
      canvas: canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null
    };
  });

  console.log('Rects on load:', JSON.stringify(rects, null, 2));

  console.log('Reloading...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const rectsAfter = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return {
      canvas: canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null
    };
  });
  console.log('Rects after reload:', JSON.stringify(rectsAfter, null, 2));
  await browser.close();
}

checkSizes();
