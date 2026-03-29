const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname, '..', 'frontend');
const targetDir = path.resolve(__dirname, 'public');
const assetFiles = [
  'guardline.html',
  'index.html',
  'sign.html',
  'verify.html',
  'documents-module.js',
  '_guardline_v2_bundle.js',
];

if (!fs.existsSync(sourceDir)) {
  console.warn('[guardline] frontend source not found:', sourceDir);
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const file of assetFiles) {
  const from = path.join(sourceDir, file);
  const to = path.join(targetDir, file);
  if (!fs.existsSync(from)) continue;
  fs.copyFileSync(from, to);
}

console.log('[guardline] frontend assets copied to', targetDir);
