import puppeteer from 'puppeteer-core';

async function previewModel() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const artifactDir = 'C:/Users/parsh/.gemini/antigravity-ide/brain/9d89c2a8-4144-4acd-b162-826610a516ff';

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });
    
    // Simple HTML with Three.js from node_modules or CDN to render car.glb
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>body { margin: 0; background: #0F172A; overflow: hidden; }</style>
        </head>
        <body>
          <canvas id="c" width="800" height="600"></canvas>
          <script type="importmap">
            {
              "imports": {
                "three": "http://localhost:5174/node_modules/three/build/three.module.js",
                "three/examples/jsm/loaders/GLTFLoader.js": "http://localhost:5174/node_modules/three/examples/jsm/loaders/GLTFLoader.js"
              }
            }
          </script>
          <script type="module">
            import * as THREE from 'three';
            import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

            const canvas = document.getElementById('c');
            const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            renderer.setSize(800, 600);
            renderer.setClearColor(0x0F172A);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(40, 800/600, 0.1, 100);
            camera.position.set(4, 2, 5);
            camera.lookAt(0, 0.5, 0);

            const ambient = new THREE.AmbientLight(0xffffff, 1.2);
            scene.add(ambient);

            const dir = new THREE.DirectionalLight(0xffffff, 2.5);
            dir.position.set(5, 10, 7);
            scene.add(dir);

            const loader = new GLTFLoader();
            loader.load('http://localhost:5174/models/scorpio-n-black.glb', (gltf) => {
              const model = gltf.scene;
              const box = new THREE.Box3().setFromObject(model);
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              const maxDim = Math.max(size.x, size.y, size.z);
              model.scale.multiplyScalar(3 / maxDim);
              box.setFromObject(model);
              box.getCenter(center);
              model.position.sub(center);
              scene.add(model);
              renderer.render(scene, camera);
              window.__RENDERED__ = true;
            });
          </script>
        </body>
      </html>
    `);

    await page.waitForFunction(() => window.__RENDERED__ === true, { timeout: 15000 });
    await page.screenshot({ path: `${artifactDir}/model_preview_check.png` });
    console.log('Saved model_preview_check.png');

  } catch (err) {
    console.error('Preview error:', err);
  } finally {
    await browser.close();
  }
}

previewModel();
