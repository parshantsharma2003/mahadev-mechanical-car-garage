import puppeteer from 'puppeteer-core';

async function testConnectSection() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const artifactDir = 'C:/Users/parsh/.gemini/antigravity-ide/brain/9d89c2a8-4144-4acd-b162-826610a516ff';

  try {
    const page = await browser.newPage();
    
    // 1. Desktop View (1366x768)
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });

    const sec = await page.$('#connect');
    if (!sec) throw new Error('#connect section not found!');

    await sec.scrollIntoView();
    await new Promise(r => setTimeout(r, 800));

    // Verify desktop state: exactly 5 visible channel items, scrollLeft is 0 and static
    const desktopStats = await page.evaluate(() => {
      const track = document.querySelector('.connect-channels-row');
      const allItems = Array.from(document.querySelectorAll('.connect-channel-item'));
      const visibleItems = allItems.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      const names = visibleItems.map(el => el.querySelector('.connect-channel-name')?.textContent?.trim());
      return {
        scrollLeft: track ? track.scrollLeft : null,
        visibleCount: visibleItems.length,
        names
      };
    });

    console.log('Desktop verification:', desktopStats);

    await sec.screenshot({ path: `${artifactDir}/connect_section_desktop.png` });
    console.log('Saved connect_section_desktop.png');

    // 2. Mobile View (390x844)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
    
    const secMobile = await page.$('#connect');
    await secMobile.scrollIntoView();
    await new Promise(r => setTimeout(r, 600));

    // Measure scrollLeft at t0
    const scrollT0 = await page.evaluate(() => {
      const track = document.querySelector('.connect-channels-row');
      return track ? track.scrollLeft : -1;
    });

    // Wait 1.5 seconds while continuous scrolling runs
    await new Promise(r => setTimeout(r, 1500));

    const scrollT1 = await page.evaluate(() => {
      const track = document.querySelector('.connect-channels-row');
      const allItems = Array.from(document.querySelectorAll('.connect-channel-item'));
      const visibleItems = allItems.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      return {
        scrollLeft: track ? track.scrollLeft : -1,
        visibleCount: visibleItems.length
      };
    });

    console.log('Mobile verification:', {
      scrollT0,
      scrollT1: scrollT1.scrollLeft,
      diff: scrollT1.scrollLeft - scrollT0,
      visibleCountMobile: scrollT1.visibleCount,
      isScrolling: scrollT1.scrollLeft !== scrollT0
    });

    await secMobile.screenshot({ path: `${artifactDir}/connect_section_mobile.png` });
    console.log('Saved connect_section_mobile.png');

    console.log('Connect section tests completed successfully!');

  } catch (err) {
    console.error('Error in connect section test:', err);
  } finally {
    await browser.close();
  }
}

testConnectSection();
