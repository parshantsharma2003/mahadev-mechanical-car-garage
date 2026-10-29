import puppeteer from 'puppeteer-core';

async function inspectServices() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const artifactDir = 'C:/Users/parsh/.gemini/antigravity-ide/brain/9d89c2a8-4144-4acd-b162-826610a516ff';

  try {
    const page = await browser.newPage();
    
    // Desktop View
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
    
    // Reset track scroll to 0 and pause
    await page.evaluate(() => {
      const track = document.querySelector('.services-carousel-track');
      if (track) track.scrollLeft = 0;
    });

    const secDesktop = await page.$('#services');
    await secDesktop.scrollIntoView();
    await new Promise(r => setTimeout(r, 400));
    
    // Ensure track is scrolled to first card
    await page.evaluate(() => {
      const track = document.querySelector('.services-carousel-track');
      if (track) track.scrollLeft = 0;
    });
    await new Promise(r => setTimeout(r, 200));

    await secDesktop.screenshot({ path: `${artifactDir}/services_current_desktop.png` });
    console.log('Saved services_current_desktop.png');

    // Hover on card 1 to capture hover state
    const firstCard = await page.$('.service-carousel-card');
    if (firstCard) {
      await firstCard.hover();
      await new Promise(r => setTimeout(r, 400));
      await secDesktop.screenshot({ path: `${artifactDir}/services_hover_desktop.png` });
      console.log('Saved services_hover_desktop.png');
    }

    // Mobile View
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await new Promise(r => setTimeout(r, 400));
    
    await page.evaluate(() => {
      const track = document.querySelector('.services-carousel-track');
      if (track) track.scrollLeft = 0;
    });

    const secMobile = await page.$('#services');
    await secMobile.scrollIntoView();
    await new Promise(r => setTimeout(r, 400));

    await page.evaluate(() => {
      const track = document.querySelector('.services-carousel-track');
      if (track) track.scrollLeft = 0;
    });
    await new Promise(r => setTimeout(r, 200));

    await secMobile.screenshot({ path: `${artifactDir}/services_current_mobile.png` });
    console.log('Saved services_current_mobile.png');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

inspectServices();
