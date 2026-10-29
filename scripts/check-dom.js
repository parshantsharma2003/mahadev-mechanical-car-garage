import puppeteer from 'puppeteer-core';

async function checkDom() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('[LOG]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[ERROR]', err.message));

  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const dom = await page.evaluate(() => {
    return {
      visualCol: document.querySelector('.hero-3d-visual-col')?.innerHTML,
      canvas: !!document.querySelector('canvas')
    };
  });

  console.log('DOM check:', dom);

  await browser.close();
}

checkDom();
