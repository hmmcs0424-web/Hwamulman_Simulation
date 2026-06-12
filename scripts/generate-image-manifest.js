const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const SECTIONS = ['차주앱', '빽통앱', '빽통PC', '채널톡'];

const manifest = {};

for (const section of SECTIONS) {
  const dir = path.join(ROOT, section);
  if (!fs.existsSync(dir)) {
    manifest[section] = [];
    continue;
  }

  manifest[section] = fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .filter(name => IMAGE_EXT.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'ko'))
    .map(name => `${section}/${name}`);
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
