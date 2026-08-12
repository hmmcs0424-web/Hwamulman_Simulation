const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const SECTIONS = ['차주앱', '빽통앱', '빽통PC', '채널톡'];

const manifest = {};

function listImages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listImages(fullPath);
    return IMAGE_EXT.has(path.extname(entry.name).toLowerCase()) ? [fullPath] : [];
  });
}

for (const section of SECTIONS) {
  const dir = path.join(ROOT, section);
  if (!fs.existsSync(dir)) {
    manifest[section] = [];
    continue;
  }

  manifest[section] = listImages(dir)
    .map(file => path.relative(ROOT, file).split(path.sep).join('/'))
    .sort((a, b) => a.localeCompare(b, 'ko'));
}

fs.writeFileSync(
  path.join(ROOT, 'image-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
);

console.log(
  Object.entries(manifest)
    .map(([section, images]) => `${section}: ${images.length}`)
    .join('\n')
);
