import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function cropExact() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5174/');

  const croppedDataUrl = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = '/images/brands/mahindra_orig.png';
      img.onload = () => {
        // Find bounds of red pixels
        const cTemp = document.createElement('canvas');
        cTemp.width = img.naturalWidth;
        cTemp.height = img.naturalHeight;
        const ctxTemp = cTemp.getContext('2d');
        ctxTemp.drawImage(img, 0, 0);

        const imgData = ctxTemp.getImageData(0, 0, cTemp.width, cTemp.height);
        const data = imgData.data;

        let minX = cTemp.width, maxX = 0, minY = cTemp.height, maxY = 0;

        for (let y = 0; y < cTemp.height; y++) {
          for (let x = 0; x < cTemp.width; x++) {
            const idx = (y * cTemp.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            // Detect red emblem pixels (R > 180, G < 50, B < 50, A > 50)
            if (a > 50 && r > 180 && g < 50 && b < 50) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        console.log('Detected red bounds:', { minX, maxX, minY, maxY });
        const w = maxX - minX;
        const h = maxY - minY;

        const pad = 20;
        const cOut = document.createElement('canvas');
        cOut.width = w + pad * 2;
        cOut.height = h + pad * 2;
        const ctxOut = cOut.getContext('2d');
        ctxOut.drawImage(cTemp, minX, minY, w, h, pad, pad, w, h);

        resolve(cOut.toDataURL('image/png'));
      };
    });
  });

  const base64 = croppedDataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync('public/images/brands/mahindra.png', Buffer.from(base64, 'base64'));
  console.log('Perfectly cropped mahindra.png with transparent background!');

  await browser.close();
}

cropExact();
