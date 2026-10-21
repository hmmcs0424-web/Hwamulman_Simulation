const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const rootFiles = [
  'index.html', 'image-manifest.json', 'notices.json',
  'membership-guide-data.json', 'profile-guide-data.json', 'signup-guide-data.json',
];
const assetDirectories = [
  'vendor', 'announcement-images', 'migrated-blob-assets',
  '가입_정지_변경', '문자_템플릿', '빽통PC', '빽통앱', '차주앱', '채널톡',
];
const webExtensions = new Set([
  '.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.webp', '.gif',
  '.svg', '.ico', '.woff', '.woff2', '.ttf', '.mp3', '.mp4', '.webm', '.pdf',
]);

// Only replace the generated output directory, never source assets.
if (path.dirname(output) !== root || path.basename(output) !== 'dist') {
  throw new Error('Unexpected deployment output path');
}
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
let bytes = 0;
let count = 0;
function copy(relative) {
  const source = path.join(root, relative);
  const destination = path.join(output, relative);
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error(`Symlink is not a deployable asset: ${relative}`);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(source)) {
      if (!name.startsWith('.')) copy(path.join(relative, name));
    }
  } else if (webExtensions.has(path.extname(relative).toLowerCase())) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    bytes += stat.size;
    count++;
  }
}
for (const file of rootFiles) copy(file);
for (const file of fs.readdirSync(root)) {
  if (file.endsWith('.css')) copy(file);
}
for (const directory of assetDirectories) {
  if (fs.existsSync(path.join(root, directory))) copy(directory);
}
console.log(`Deployment output: ${count} files, ${(bytes / 1024 / 1024).toFixed(2)} MiB (dist)`);
