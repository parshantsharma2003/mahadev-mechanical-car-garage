import fs from 'fs';
import path from 'path';

const brandDir = path.join(process.cwd(), 'public', 'images', 'brands');
if (!fs.existsSync(brandDir)) fs.mkdirSync(brandDir, { recursive: true });

async function prepareLogos() {
  // 1. Maruti Suzuki (Pure red 'S' emblem)
  const suzukiPath = path.join(brandDir, 'maruti-suzuki.svg');
  if (fs.existsSync(suzukiPath)) {
    const raw = fs.readFileSync(suzukiPath, 'utf-8');
    const pathMatch = raw.match(/<path[^>]*id=["']refine_final["'][^>]*d=["']([^"']+)["'][^>]*>/);
    if (pathMatch) {
      const suzukiSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="134 0 236 215" width="100" height="91">
  <path d="${pathMatch[1]}" fill="#E31E24" />
</svg>`;
      fs.writeFileSync(suzukiPath, suzukiSvg, 'utf-8');
      console.log('Processed maruti-suzuki.svg (Pure S emblem)');
    }
  }

  // 2. Hyundai (Pure blue oval 'H' emblem)
  const hyundaiSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 94 50" width="100" height="53">
  <path fill="#002C6C" d="m 56.707,29.416 c 0.714,3.69 -1.22,6.755 -2.827,9.73 -1.785,2.768 -4.731,5.147 -8.272,4.791 -7.946,-0.119 -15.712,-1.339 -22.914,-3.512 -0.327,-0.089 -0.654,-0.298 -0.833,-0.595 -0.149,-0.417 0.06,-0.804 0.357,-1.071 6.577,-5.327 14.403,-7.796 22.14,-10.386 2.886,-0.833 5.952,-1.726 9.195,-1.309 1.338,0.179 2.677,1.102 3.154,2.352 z M 83.816,13.645 c 3.69,3.035 7.023,7.172 5.892,12.171 -1.845,7.38 -9.879,11.308 -16.277,13.807 -3.482,1.161 -6.993,2.352 -10.802,2.709 -0.238,-0.03 -0.625,0.029 -0.685,-0.328 l 0.089,-0.416 c 5.416,-6.101 9.522,-12.944 13.124,-19.878 1.666,-3.125 3.214,-6.338 4.642,-9.493 0.208,-0.238 0.417,-0.357 0.655,-0.446 1.338,0.118 2.291,1.16 3.362,1.874 z M 31.888,5.789 31.769,6.235 C 23.943,15.132 18.795,25.458 13.915,35.724 12.963,36.617 12.04,35.426 11.177,35.039 6.832,32.183 2.904,27.57 4.035,22.095 5.85,14.954 13.2,11.145 19.331,8.557 c 3.63,-1.369 7.41,-2.47 11.397,-3.095 0.417,-10e-4 0.952,-0.06 1.16,0.327 z m 38.835,1.428 c 0.446,0.238 0.982,0.327 1.25,0.773 0.238,0.506 -0.238,0.833 -0.506,1.161 -6.16,4.82 -13.212,7.499 -20.414,9.85 -3.661,0.893 -7.351,2.5 -11.427,1.607 -0.953,-0.238 -1.815,-0.863 -2.351,-1.786 -1.012,-2.797 0.357,-5.713 1.547,-8.153 1.577,-3.065 4.375,-6.666 8.243,-6.725 8.332,-0.06 16.188,1.19 23.658,3.273 z M 81.019,7.455 C 87.328,10.907 94.47,16.977 93.726,25.071 92.863,32.57 85.87,37.807 79.621,40.962 61.379,49.681 35.758,49.948 16.921,42.331 10.552,39.683 3.41,35.13 0.731,28.285 -1.322,22.661 1.177,16.799 5.374,12.901 14.152,4.926 25.341,2.189 36.858,0.611 c 12.499,-1.518 25.651,-0.179 36.84,3.66 2.5,0.923 4.97,1.935 7.321,3.184 z"/>
</svg>`;
  fs.writeFileSync(path.join(brandDir, 'hyundai.svg'), hyundaiSvg, 'utf-8');
  console.log('Processed hyundai.svg (Pure oval H emblem)');

  // 3. Toyota (Classic triple ellipse emblem)
  const toyotaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64.44 41.55" width="100" height="64.5">
  <path fill="#5A6472" d="M46.54 2.04A47.5 47.5 0 0 0 32.22 0 47.5 47.5 0 0 0 17.9 2.04C7.3 5.45 0 12.53 0 20.69c0 11.49 14.4 20.86 32.22 20.86 17.78 0 32.22-9.33 32.22-20.86 0-8.16-7.28-15.24-17.9-18.65zM32.22 32.6c-2.66 0-4.83-5.2-4.95-11.79 1.58.17 3.24.21 4.95.21 1.7 0 3.37-.08 4.96-.2-.13 6.57-2.3 11.78-4.96 11.78ZM27.6 15.7c.7-4.63 2.5-7.87 4.62-7.87 2.08 0 3.87 3.24 4.62 7.86a52.52 52.52 0 0 1-9.24.01zm12.07-.38c-1.08-7.2-4-12.4-7.45-12.4s-6.37 5.16-7.45 12.4c-6.54-1.04-11.12-3.33-11.12-6.04 0-3.66 8.33-6.62 18.57-6.62S50.8 5.62 50.8 9.28c0 2.7-4.58 5.04-11.12 6.04zM4.7 19.94c0-3.54 1.38-6.83 3.75-9.7-.04.2-.04.42-.04.58 0 4.46 6.66 8.2 15.94 9.62v1c0 8.24 2.3 15.24 5.46 17.65-14.07-.83-25.1-9.08-25.1-19.15zm29.94 19.2c3.16-2.42 5.45-9.42 5.45-17.66v-1c9.28-1.37 15.94-5.16 15.94-9.61 0-.21 0-.42-.04-.59a15.06 15.06 0 0 1 3.75 9.7c0 10.03-11.03 18.28-25.1 19.15z"/>
</svg>`;
  fs.writeFileSync(path.join(brandDir, 'toyota.svg'), toyotaSvg, 'utf-8');
  console.log('Processed toyota.svg (Pure triple-ellipse emblem)');

  // 4. Download Tata official emblem
  const tataRes = await fetch('https://upload.wikimedia.org/wikipedia/commons/8/8e/Tata_logo.svg', { headers: { 'User-Agent': 'CarGarageApp/1.0' } });
  const tataText = await tataRes.text();
  fs.writeFileSync(path.join(brandDir, 'tata.svg'), tataText, 'utf-8');
  console.log('Downloaded Tata emblem (tata.svg)');

  // 5. Download Honda pure emblem
  const hondaRes = await fetch('https://upload.wikimedia.org/wikipedia/commons/3/38/Honda.svg', { headers: { 'User-Agent': 'CarGarageApp/1.0' } });
  const hondaText = await hondaRes.text();
  fs.writeFileSync(path.join(brandDir, 'honda.svg'), hondaText, 'utf-8');
  console.log('Downloaded Honda emblem (honda.svg)');

  // 6. Download Mahindra Auto red emblem
  const mahindraRes = await fetch('https://upload.wikimedia.org/wikipedia/commons/8/82/Mahindra_Auto.png', { headers: { 'User-Agent': 'CarGarageApp/1.0' } });
  const mahindraBuf = Buffer.from(await mahindraRes.arrayBuffer());
  fs.writeFileSync(path.join(brandDir, 'mahindra.png'), mahindraBuf);
  console.log('Downloaded Mahindra emblem (mahindra.png)');

  // 7. Renault (Modern clean black geometric diamond emblem)
  const renaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 135" width="100" height="135">
  <path fill="#050505" fill-rule="evenodd" d="M50 0 L94 48 L76 68 L50 40 L24 68 L6 48 Z M50 135 L6 87 L24 67 L50 95 L76 67 L94 87 Z M50 56 L68 76 L50 96 L32 76 Z"/>
</svg>`;
  fs.writeFileSync(path.join(brandDir, 'renault.svg'), renaultSvg, 'utf-8');
  console.log('Processed renault.svg (Modern clean diamond)');
}

prepareLogos();
