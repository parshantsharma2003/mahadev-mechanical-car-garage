import fs from 'fs';

const buf = fs.readFileSync('public/models/scorpio-n-black.glb');
const chunkLength = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + chunkLength);
const gltf = JSON.parse(jsonStr);

console.log('Materials in GLB:');
gltf.materials?.forEach((mat, i) => {
  console.log(`\nMaterial ${i}: ${mat.name}`);
  console.log(JSON.stringify(mat, null, 2));
});
