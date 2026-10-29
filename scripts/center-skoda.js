import fs from 'fs';

const raw = fs.readFileSync('public/images/brands/skoda.svg', 'utf-8');
const fixed = raw.replace(/viewBox="[^"]+"/, 'viewBox="1450 600 940 940"');
fs.writeFileSync('public/images/brands/skoda.svg', fixed, 'utf-8');
console.log('Centered skoda.svg');
