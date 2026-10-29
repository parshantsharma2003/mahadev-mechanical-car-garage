import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function check() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5174/images/brands/mahindra_orig.png');
  const info = await page.$eval('img', el => ({
    width: el.naturalWidth,
    height: el.naturalHeight
  }));
  console.log('Mahindra orig dimensions:', info);

  // Take screenshot of mahindra_orig.png
  await page.screenshot({ path: 'C:/Users/parsh/.gemini/antigravity-ide/brain/9d89c2a8-4144-4acd-b162-826610a516ff/mahindra_orig_screenshot.png' });
  await browser.close();
}
check();
