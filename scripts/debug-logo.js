import puppeteer from 'puppeteer-core';

async function checkNavbar() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });

  const comp = await page.$eval('.brand-logo-img', el => {
    const s = window.getComputedStyle(el);
    return {
      height: s.height,
      maxHeight: s.maxHeight,
      width: s.width,
      maxWidth: s.maxWidth,
      objectFit: s.objectFit,
      display: s.display
    };
  });
  console.log('Computed styles of .brand-logo-img:', comp);

  await browser.close();
}
checkNavbar();
