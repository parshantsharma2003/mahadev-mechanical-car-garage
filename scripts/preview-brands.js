import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function previewBrands() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 400 });

  const brands = [
    { id: 'maruti-suzuki', name: 'Maruti Suzuki' },
    { id: 'hyundai', name: 'Hyundai' },
    { id: 'toyota', name: 'Toyota' },
    { id: 'tata', name: 'Tata' },
    { id: 'honda', name: 'Honda' },
    { id: 'mahindra', name: 'Mahindra' },
    { id: 'kia', name: 'Kia' },
    { id: 'ford', name: 'Ford' },
    { id: 'renault', name: 'Renault' },
    { id: 'nissan', name: 'Nissan' },
    { id: 'skoda', name: 'Skoda' },
    { id: 'volkswagen', name: 'Volkswagen' }
  ];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; background: #fff; padding: 40px; display: flex; gap: 16px; overflow-x: auto; }
        .card {
          width: 110px; height: 130px; border: 1px solid #E2E8F0; border-radius: 12px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 12px 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .logo-wrap { width: 64px; height: 50px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
        .logo-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .name { font-size: 13px; font-weight: 600; color: #1E293B; text-align: center; line-height: 1.2; }
      </style>
    </head>
    <body>
      ${brands.map(b => {
        const ext = b.id === 'mahindra' ? 'png' : 'svg';
        return `
        <div class="card">
          <div class="logo-wrap">
            <img src="http://localhost:5174/images/brands/${b.id}.${ext}" alt="${b.name}" />
          </div>
          <div class="name">${b.name}</div>
        </div>
      `}).join('')}
    </body>
    </html>
  `;

  await page.setContent(html);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'C:/Users/parsh/.gemini/antigravity-ide/brain/9d89c2a8-4144-4acd-b162-826610a516ff/brands_preview.png' });
  console.log('Saved brands_preview.png');
  await browser.close();
}

previewBrands();
