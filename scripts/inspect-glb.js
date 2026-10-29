import fs from 'fs';

const buf = fs.readFileSync('public/models/scorpio-n-black.glb');
const magic = buf.readUInt32LE(0);
const version = buf.readUInt32LE(4);
const length = buf.readUInt32LE(8);
const chunkLength = buf.readUInt32LE(12);
const chunkType = buf.readUInt32LE(16);

console.log('GLB Header:', { magic: magic.toString(16), version, length, chunkLength });

if (chunkType === 0x4E4F534A) { // JSON
  const jsonStr = buf.toString('utf8', 20, 20 + chunkLength);
  const gltf = JSON.parse(jsonStr);

  console.log('\n--- GLTF Structure ---');
  console.log('Meshes count:', gltf.meshes?.length);
  console.log('Images count:', gltf.images?.length);
  console.log('Materials count:', gltf.materials?.length);
  console.log('Accessors count:', gltf.accessors?.length);
  console.log('BufferViews count:', gltf.bufferViews?.length);

  if (gltf.images) {
    console.log('\nImages:');
    gltf.images.forEach((img, i) => {
      const bv = gltf.bufferViews[img.bufferView];
      console.log(`Image ${i}: mimeType=${img.mimeType}, byteLength=${bv?.byteLength}`);
    });
  }

  let totalBufferLength = 0;
  if (gltf.buffers) {
    gltf.buffers.forEach((b, i) => {
      console.log(`Buffer ${i}: byteLength=${b.byteLength}`);
      totalBufferLength += b.byteLength;
    });
  }
}
