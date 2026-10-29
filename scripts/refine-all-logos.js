import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const brandDir = path.join(process.cwd(), 'public', 'images', 'brands');

async function refineLogos() {
  // 1. Hyundai with fill-rule="evenodd"
  const hyundaiD = `m 56.707,29.416 c 0.714,3.69 -1.22,6.755 -2.827,9.73 -1.785,2.768 -4.731,5.147 -8.272,4.791 -7.946,-0.119 -15.712,-1.339 -22.914,-3.512 -0.327,-0.089 -0.654,-0.298 -0.833,-0.595 -0.149,-0.417 0.06,-0.804 0.357,-1.071 6.577,-5.327 14.403,-7.796 22.14,-10.386 2.886,-0.833 5.952,-1.726 9.195,-1.309 1.338,0.179 2.677,1.102 3.154,2.352 z M 83.816,13.645 c 3.69,3.035 7.023,7.172 5.892,12.171 -1.845,7.38 -9.879,11.308 -16.277,13.807 -3.482,1.161 -6.993,2.352 -10.802,2.709 -0.238,-0.03 -0.625,0.029 -0.685,-0.328 l 0.089,-0.416 c 5.416,-6.101 9.522,-12.944 13.124,-19.878 1.666,-3.125 3.214,-6.338 4.642,-9.493 0.208,-0.238 0.417,-0.357 0.655,-0.446 1.338,0.118 2.291,1.16 3.362,1.874 z M 31.888,5.789 31.769,6.235 C 23.943,15.132 18.795,25.458 13.915,35.724 12.963,36.617 12.04,35.426 11.177,35.039 6.832,32.183 2.904,27.57 4.035,22.095 5.85,14.954 13.2,11.145 19.331,8.557 c 3.63,-1.369 7.41,-2.47 11.397,-3.095 0.417,-10e-4 0.952,-0.06 1.16,0.327 z m 38.835,1.428 c 0.446,0.238 0.982,0.327 1.25,0.773 0.238,0.506 -0.238,0.833 -0.506,1.161 -6.16,4.82 -13.212,7.499 -20.414,9.85 -3.661,0.893 -7.351,2.5 -11.427,1.607 -0.953,-0.238 -1.815,-0.863 -2.351,-1.786 -1.012,-2.797 0.357,-5.713 1.547,-8.153 1.577,-3.065 4.375,-6.666 8.243,-6.725 8.332,-0.06 16.188,1.19 23.658,3.273 z M 81.019,7.455 C 87.328,10.907 94.47,16.977 93.726,25.071 92.863,32.57 85.87,37.807 79.621,40.962 61.379,49.681 35.758,49.948 16.921,42.331 10.552,39.683 3.41,35.13 0.731,28.285 -1.322,22.661 1.177,16.799 5.374,12.901 14.152,4.926 25.341,2.189 36.858,0.611 c 12.499,-1.518 25.651,-0.179 36.84,3.66 2.5,0.923 4.97,1.935 7.321,3.184 z`;
  const hyundaiSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 94 50" width="100" height="53">
  <path fill-rule="evenodd" clip-rule="evenodd" fill="#002C6C" d="${hyundaiD}"/>
</svg>`;
  fs.writeFileSync(path.join(brandDir, 'hyundai.svg'), hyundaiSvg, 'utf-8');
  console.log('Fixed hyundai.svg (hollow cutout oval H)');

  // 2. Tata pure circle emblem without TATA letters
  const tataSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="70 20 315 230" width="100" height="73">
  <g fill="#005A9C" fill-rule="evenodd" clip-rule="evenodd">
    <path d="M375.394,93.432c-3.794-7.461-8.791-14.612-15.007-21.318 c-13.969-15.077-33.678-27.623-57.002-36.276c-23.516-8.72-50.338-13.334-77.595-13.334s-54.079,4.614-77.583,13.334 c-23.336,8.654-43.046,21.2-57.015,36.276C84.98,78.819,79.967,85.98,76.174,93.445c30.365-7.343,82.306-17.038,130.534-18.063 c4.652-0.1,7.855,1.39,9.964,4.063c2.569,3.255,2.376,14.858,2.313,20.049l-1.371,134.17c2.716,0.09,5.445,0.148,8.176,0.148 c2.754,0,5.498-0.045,8.214-0.135l-1.371-134.184c-0.071-5.19-0.27-16.794,2.308-20.049c2.114-2.672,5.306-4.162,9.957-4.063 C293.106,76.398,345.035,86.095,375.394,93.432"/>
    <path d="M381.877,110.88c-44.442-10.047-74.121-11.905-103.405-13.53 c-25.526-1.419-25.859,7.696-23.311,25.115c0.167,1.063,0.372,2.403,0.615,3.931c8.562,50.712,19.224,94.352,21.056,101.759 c62.23-14.225,107.109-53.664,107.109-99.994C383.941,122.327,383.236,116.547,381.877,110.88"/>
    <path d="M196.443,122.465c2.551-17.418,2.224-26.534-23.299-25.115 c-29.294,1.625-58.98,3.482-103.439,13.536c-1.358,5.667-2.072,11.44-2.072,17.274c0,20.024,8.146,39.4,23.56,56.047 c13.969,15.077,33.679,27.623,57.015,36.282c8.446,3.127,17.359,5.69,26.54,7.74c1.723-6.939,12.63-51.487,21.285-103.106 C196.193,124.134,196.341,123.221,196.443,122.465"/>
  </g>
</svg>`;
  fs.writeFileSync(path.join(brandDir, 'tata.svg'), tataSvg, 'utf-8');
  console.log('Fixed tata.svg (pure circular T logo)');

  // 3. Honda metallic/chrome H emblem
  const hondaRaw = fs.readFileSync(path.join(brandDir, 'honda.svg'), 'utf-8');
  const gMatch = hondaRaw.match(/<g id="g1963">([\s\S]*?)<\/g>/);
  if (gMatch) {
    const hondaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2200 1780" width="100" height="81">
  <g fill="#475569">
    ${gMatch[1].replace(/fill="#DA251D"/g, 'fill="#475569"')}
  </g>
</svg>`;
    fs.writeFileSync(path.join(brandDir, 'honda.svg'), hondaSvg, 'utf-8');
    console.log('Fixed honda.svg (pure metallic H emblem)');
  }

  // 4. Skoda: tighten viewBox around the circular winged arrow
  const skodaRaw = fs.readFileSync(path.join(brandDir, 'skoda.svg'), 'utf-8');
  // Check if we can find the viewBox or scale
  const skodaTight = skodaRaw.replace(/viewBox=["'][^"']+["']/, 'viewBox="0 0 100 100"');
  // Let's check what skoda currently has
  console.log('Skoda length:', skodaRaw.length);

  // 5. Mahindra: Crop mahindra.png to just the twin-peaks road emblem
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 500 });
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <canvas id="c" width="300" height="180"></canvas>
      <script>
        const img = new Image();
        img.src = "http://localhost:5174/images/brands/mahindra.png";
        img.onload = () => {
          const c = document.getElementById("c");
          const ctx = c.getContext("2d");
          // The logo is in the top portion of the image
          // Natural width 600, height 337
          // The emblem is centered around x: 160-440, y: 10-170
          ctx.drawImage(img, 150, 10, 300, 175, 0, 0, 300, 175);
          window.canvasDone = true;
        };
      </script>
    </body>
    </html>
  `);

  await page.waitForFunction('window.canvasDone === true', { timeout: 6000 });
  const dataUrl = await page.evaluate(() => {
    return document.getElementById('c').toDataURL('image/png');
  });
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(brandDir, 'mahindra.png'), Buffer.from(base64Data, 'base64'));
  console.log('Cropped mahindra.png to pure emblem!');

  await browser.close();
}

refineLogos();
