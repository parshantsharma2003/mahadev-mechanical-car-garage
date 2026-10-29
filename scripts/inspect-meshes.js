import puppeteer from 'puppeteer-core';

async function inspectGLTFInBrowser() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });

    const meshDetails = await page.evaluate(async () => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');

      return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load('/models/scorpio-n-black.glb', (gltf) => {
          const results = [];
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              const b = new THREE.Box3().setFromObject(child);
              const s = b.getSize(new THREE.Vector3());
              const c = b.getCenter(new THREE.Vector3());
              results.push({
                name: child.name,
                matName: child.material ? (child.material.name || child.material.type) : 'none',
                sizeX: s.x.toFixed(2),
                sizeY: s.y.toFixed(2),
                sizeZ: s.z.toFixed(2),
                centerX: c.x.toFixed(2),
                centerY: c.y.toFixed(2),
                centerZ: c.z.toFixed(2)
              });
            }
          });
          resolve(results);
        }, undefined, reject);
      });
    });

    console.log(JSON.stringify(meshDetails, null, 2));

  } catch (err) {
    console.error('Error inspecting mesh:', err);
  } finally {
    await browser.close();
  }
}

inspectGLTFInBrowser();
