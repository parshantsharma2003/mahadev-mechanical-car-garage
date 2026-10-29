import fs from 'fs';

const raw = fs.readFileSync('public/images/brands/skoda.svg', 'utf-8');
const fixed = raw.replace('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="3840" height="2160">', '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="1420 480 1000 1000" width="100" height="100">');
fs.writeFileSync('public/images/brands/skoda.svg', fixed, 'utf-8');
console.log('Successfully set viewBox on skoda.svg');
