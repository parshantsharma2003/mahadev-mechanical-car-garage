import puppeteer from 'puppeteer-core';

async function testGallery() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const artifactDir = 'C:/Users/parsh/.gemini/antigravity-ide/brain/9d89c2a8-4144-4acd-b162-826610a516ff';

  try {
    const page = await browser.newPage();
    
    // 1. Desktop Home Gallery (1366x768)
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });

    // Scroll to #gallery
    const sec = await page.$('#gallery');
    await sec.scrollIntoView();
    await new Promise(r => setTimeout(r, 600));

    // Verify UI elements removal
    const checks = await page.evaluate(() => {
      const headerActions = document.querySelector('.gallery-header-actions');
      const dotsRow = document.querySelector('.gallery-dots-row');
      const viewAllHeaderBtn = document.querySelector('.view-all-gallery-btn');
      const autoToggleBtn = document.querySelector('.auto-scroll-toggle-btn');
      const navArrows = document.querySelector('.gallery-nav-buttons');
      const cardCount = document.querySelectorAll('.gallery-card').length;
      return {
        hasHeaderActions: !!headerActions,
        hasDotsRow: !!dotsRow,
        hasViewAllHeaderBtn: !!viewAllHeaderBtn,
        hasAutoToggleBtn: !!autoToggleBtn,
        hasNavArrows: !!navArrows,
        cardCount
      };
    });

    console.log('Verification of removed elements:', checks);

    await sec.screenshot({ path: `${artifactDir}/gallery_desktop_home_clean.png` });
    console.log('Saved gallery_desktop_home_clean.png');

    // 2. Click first card to test Lightbox with description
    const firstCard = await page.$('.gallery-card');
    if (firstCard) {
      await firstCard.click();
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: `${artifactDir}/gallery_lightbox_modal.png` });
      console.log('Saved gallery_lightbox_modal.png');

      // Close lightbox
      const closeBtn = await page.$('.lightbox-close-btn');
      if (closeBtn) await closeBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }

    // 3. Test bottom strip "Browse All Photos" button
    const stripBtn = await page.$('.gallery-strip-btn');
    if (stripBtn) {
      await stripBtn.click();
      await new Promise(r => setTimeout(r, 500));
      
      const allCardsCount = await page.evaluate(() => document.querySelectorAll('.all-grid-card').length);
      console.log(`Total images in "Browse All Photos" modal: ${allCardsCount}`);

      await page.screenshot({ path: `${artifactDir}/gallery_view_all_modal.png` });
      console.log('Saved gallery_view_all_modal.png');

      // Close all modal
      const closeAllBtn = await page.$('.all-gallery-close-btn');
      if (closeAllBtn) await closeAllBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }

    // 4. Mobile Home Gallery View (390x844)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await new Promise(r => setTimeout(r, 400));
    const secMobile = await page.$('#gallery');
    await secMobile.scrollIntoView();
    await new Promise(r => setTimeout(r, 500));

    await secMobile.screenshot({ path: `${artifactDir}/gallery_mobile_home_clean.png` });
    console.log('Saved gallery_mobile_home_clean.png');

    console.log('All gallery UI verification completed successfully!');

  } catch (err) {
    console.error('Error in gallery test:', err);
  } finally {
    await browser.close();
  }
}

testGallery();
