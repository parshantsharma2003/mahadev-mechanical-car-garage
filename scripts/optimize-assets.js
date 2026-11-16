import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function optimizeImages() {
  console.log('Starting image optimization via headless Chrome canvas...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Helper to convert an image buffer to WebP via browser Canvas
  async function convertToWebP(inputPath, outputPath, maxWidth = null, quality = 0.85) {
    const absPath = path.resolve(inputPath);
    if (!fs.existsSync(absPath)) {
      console.warn(`File not found: ${absPath}`);
      return;
    }
    const ext = path.extname(absPath).slice(1);
    const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/svg+xml';
    const dataUri = `data:${mime};base64,${fs.readFileSync(absPath).toString('base64')}`;

    const beforeSize = fs.statSync(absPath).size;

    const dataUrl = await page.evaluate(async (src, maxW, q) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (maxW && w > maxW) {
            h = Math.round((h * maxW) / w);
            w = maxW;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve({
            dataUrl: canvas.toDataURL('image/webp', q),
            width: w,
            height: h
          });
        };
        img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
        img.src = src;
      });
    }, dataUri, maxWidth, quality);

    const base64Data = dataUrl.dataUrl.replace(/^data:image\/webp;base64,/, '');
    const outBuf = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(outputPath, outBuf);
    const afterSize = outBuf.length;
    const savings = (((beforeSize - afterSize) / beforeSize) * 100).toFixed(1);
    console.log(`[Optimized] ${path.basename(inputPath)} (${dataUrl.width}x${dataUrl.height}): ${(beforeSize / 1024).toFixed(1)} KB -> ${(afterSize / 1024).toFixed(1)} KB (${savings}% saved)`);
    return { width: dataUrl.width, height: dataUrl.height, beforeSize, afterSize };
  }

  // Optimize hero image
  await convertToWebP('public/images/scorpio-n-hero.png', 'public/images/scorpio-n-hero.webp', 1200, 0.88);

  // Also create a mobile-sized variant of hero image (640px)
  await convertToWebP('public/images/scorpio-n-hero.png', 'public/images/scorpio-n-hero-sm.webp', 640, 0.85);

  // Optimize logos
  await convertToWebP('public/images/logo.png', 'public/images/logo.webp', 480, 0.90);
  await convertToWebP('public/images/logo-transparent.png', 'public/images/logo-transparent.webp', 480, 0.90);
  await convertToWebP('public/logo.png', 'public/logo.webp', 480, 0.90);
  await convertToWebP('public/logo-transparent.png', 'public/logo-transparent.webp', 480, 0.90);

  // Optimize workshop service images (max width 800px is more than enough for cards and hero background)
  const serviceImages = [
    'periodic-service.jpg',
    'ac-service.jpg',
    'car-detailing.jpg',
    'carbon-cleaning.jpg',
    'engine-carbon-cleaning.jpg',
    'foam-wash.jpg',
    'steam-wash.jpg'
  ];

  for (const imgName of serviceImages) {
    const src = path.join('public/images', imgName);
    const out = path.join('public/images', imgName.replace(/\.jpg$/, '.webp'));
    await convertToWebP(src, out, 900, 0.82);
  }

  // Optimize mahindra brand logo
  if (fs.existsSync('public/images/brands/mahindra.png')) {
    await convertToWebP('public/images/brands/mahindra.png', 'public/images/brands/mahindra.webp', 200, 0.88);
  }

  // Optimize Skoda: render the existing skoda.svg onto a clean 160x160 canvas as WebP
  console.log('Rendering clean skoda.webp from skoda.svg...');
  const skodaSvg = fs.readFileSync('public/images/brands/skoda.svg', 'utf-8');
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;width:160px;height:160px;"><div id="wrap" style="width:160px;height:160px;display:flex;align-items:center;justify-content:center;">${skodaSvg}</div></body></html>`);
  
  await page.evaluate(() => {
    const svg = document.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '140');
      svg.setAttribute('height', '140');
      svg.style.width = '140px';
      svg.style.height = '140px';
    }
  });

  const wrapEl = await page.$('#wrap');
  const skodaPng = await wrapEl.screenshot({ omitBackground: true });
  fs.writeFileSync('public/images/brands/skoda.png', skodaPng);
  console.log(`Rendered skoda.png: ${(skodaPng.length / 1024).toFixed(1)} KB (down from 670 KB!)`);

  await convertToWebP('public/images/brands/skoda.png', 'public/images/brands/skoda.webp', 140, 0.90);

  await browser.close();
  console.log('All image conversions completed successfully.');
}

optimizeImages().catch(console.error);
