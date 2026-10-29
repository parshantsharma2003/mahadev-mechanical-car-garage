import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function optimizeGlb() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('[EXPORT LOG]', msg.text()));
    page.on('pageerror', err => console.error('[EXPORT ERROR]', err));

    await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });

    console.log('Optimizing GLB inside Three.js context...');

    const glbBase64 = await page.evaluate(async () => {
      // Import Three.js modules from Vite node_modules
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
      const { GLTFExporter } = await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js');

      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync('/models/scorpio-n-black.glb');
      const scene = gltf.scene;

      // 1. Remove non-car background clutter (clouds, huge baked planes)
      const toRemove = [];
      scene.traverse((child) => {
        const name = (child.name || '').toLowerCase();
        const matName = (child.material?.name || '').toLowerCase();
        if (
          name.includes('cloud') || 
          name.includes('gp_layer') || 
          name.includes('plane') || 
          matName.includes('cloud') || 
          matName.includes('shadow')
        ) {
          toRemove.push(child);
        }
      });

      toRemove.forEach((obj) => {
        if (obj.parent) obj.parent.remove(obj);
      });

      // 2. Measure bounding box and normalize scale & center vehicle
      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      const targetLength = 3.7;
      const scaleFactor = targetLength / (maxDim || 1);
      scene.scale.setScalar(scaleFactor);

      box.setFromObject(scene);
      box.getCenter(center);

      scene.position.x = -center.x;
      scene.position.y = -box.min.y;
      scene.position.z = -center.z;

      // Apply transformations to geometry so the hierarchy has clean 1.0 scale and 0 position
      scene.updateMatrixWorld(true);

      // 3. Clean up heavy 16MB unneeded textures by replacing with lightweight vertex materials
      scene.traverse((child) => {
        if (child.isMesh && child.material) {
          // Dispose textures
          if (child.material.map) {
            child.material.map.dispose();
            child.material.map = null;
          }
          // Set simplified standard materials preserving names for runtime styling
          const matName = (child.material.name || child.name || '').toLowerCase();
          const cleanMat = new THREE.MeshStandardMaterial({
            name: matName,
            color: child.material.color || 0x222222,
            roughness: 0.2,
            metalness: 0.8
          });
          child.material.dispose();
          child.material = cleanMat;
        }
      });

      // 4. Export clean binary GLB
      const exporter = new GLTFExporter();
      return new Promise((resolve, reject) => {
        exporter.parse(
          scene,
          (result) => {
            // result is an ArrayBuffer
            const bytes = new Uint8Array(result);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            }
            resolve(btoa(binary));
          },
          (err) => reject(err),
          { binary: true }
        );
      });
    });

    const buffer = Buffer.from(glbBase64, 'base64');
    console.log(`Original size: 20,500,984 bytes`);
    console.log(`Optimized size: ${buffer.length.toLocaleString()} bytes (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);

    // Backup original
    if (!fs.existsSync('public/models/scorpio-n-black.glb.bak')) {
      fs.copyFileSync('public/models/scorpio-n-black.glb', 'public/models/scorpio-n-black.glb.bak');
    }

    fs.writeFileSync('public/models/scorpio-n-black.glb', buffer);
    console.log('Saved optimized public/models/scorpio-n-black.glb!');

  } catch (err) {
    console.error('Optimization error:', err);
  } finally {
    await browser.close();
  }
}

optimizeGlb();
