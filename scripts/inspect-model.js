global.self = global;
global.window = global;

import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Read GLB header directly (first 20 bytes)
const buffer = fs.readFileSync('public/models/scorpio-n-black.glb');
console.log('File size:', (buffer.length / (1024 * 1024)).toFixed(2), 'MB');
const magic = buffer.toString('utf8', 0, 4);
const version = buffer.readUInt32LE(4);
const length = buffer.readUInt32LE(8);
console.log(`GLB Magic: ${magic}, Version: ${version}, Total Length: ${length}`);

// Read JSON chunk (chunk 0)
const jsonChunkLength = buffer.readUInt32LE(12);
const jsonChunkType = buffer.toString('utf8', 16, 20);
console.log(`JSON Chunk Type: ${jsonChunkType}, Length: ${jsonChunkLength}`);

if (jsonChunkType === 'JSON') {
  const jsonStr = buffer.toString('utf8', 20, 20 + jsonChunkLength);
  const gltfData = JSON.parse(jsonStr);
  console.log('Meshes count:', gltfData.meshes ? gltfData.meshes.length : 0);
  console.log('Nodes count:', gltfData.nodes ? gltfData.nodes.length : 0);
  console.log('Materials count:', gltfData.materials ? gltfData.materials.length : 0);
  if (gltfData.materials) {
    console.log('Material names:', gltfData.materials.map(m => m.name));
  }
  if (gltfData.nodes) {
    console.log('Sample node names:', gltfData.nodes.slice(0, 30).map(n => n.name));
  }
}
