import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function rgbToLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(rgb1, rgb2) {
  const lum1 = rgbToLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = rgbToLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

async function auditContrast() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' }).catch(() => {});

  // Wait for React to render
  await new Promise(r => setTimeout(r, 1500));

  const issues = await page.evaluate(() => {
    const results = [];
    const elements = document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6, strong, li');

    function parseColor(str) {
      const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!match) return null;
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1
      };
    }

    function getEffectiveBg(el) {
      let cur = el;
      while (cur && cur !== document.documentElement) {
        const bg = window.getComputedStyle(cur).backgroundColor;
        const parsed = parseColor(bg);
        if (parsed && parsed.a > 0.5) return parsed;
        cur = cur.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    }

    elements.forEach(el => {
      const text = el.innerText ? el.innerText.trim() : '';
      if (!text || el.children.length > 2) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const style = window.getComputedStyle(el);
      const fg = parseColor(style.color);
      const bg = getEffectiveBg(el);
      if (!fg) return;

      // Calculate relative luminance
      const lum1 = (0.2126 * (fg.r/255) + 0.7152 * (fg.g/255) + 0.0722 * (fg.b/255));
      const lum2 = (0.2126 * (bg.r/255) + 0.7152 * (bg.g/255) + 0.0722 * (bg.b/255));
      const contrast = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);

      const isLarge = parseFloat(style.fontSize) >= 18 || (parseFloat(style.fontSize) >= 14 && (style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 700));
      const threshold = isLarge ? 3.0 : 4.5;

      if (contrast < threshold && fg.a > 0.4) {
        results.push({
          tag: el.tagName,
          className: el.className,
          text: text.substring(0, 35),
          fg: style.color,
          bg: `rgb(${bg.r},${bg.g},${bg.b})`,
          contrast: contrast.toFixed(2),
          required: threshold
        });
      }
    });

    return results;
  });

  console.log('Low Contrast Elements found:', issues.length);
  issues.slice(0, 15).forEach(iss => console.log(iss));

  await browser.close();
}

auditContrast().catch(console.error);
