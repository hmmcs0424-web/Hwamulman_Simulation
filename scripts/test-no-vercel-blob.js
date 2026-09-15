const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const indexHtml = read('index.html');
const announcementSource = read('src/announcement-app.jsx');
const announcementBundle = read('vendor/announcement-app.js');

assert.equal(packageJson.dependencies?.['@vercel/blob'], undefined, '@vercel/blob dependency remains');
assert.doesNotMatch(packageJson.scripts?.build || '', /vercel-blob/i, 'Blob build step remains');

for (const file of [
  'api/assets/upload.js',
  'api/assets/list.js',
  'api/assets/rename.js',
  'api/assets/delete.js',
  'scripts/vercel-blob-browser-entry.js',
  'scripts/build-vercel-blob-client.js',
  'vendor/vercel-blob-client.js',
]) {
  assert.equal(fs.existsSync(path.join(root, file)), false, `${file} remains`);
}

for (const [name, source] of [
  ['index.html', indexHtml],
  ['src/announcement-app.jsx', announcementSource],
  ['vendor/announcement-app.js', announcementBundle],
]) {
  assert.doesNotMatch(source, /@vercel\/blob|vercel-blob-client|\/api\/assets\/(?:upload|list|rename|delete)|announcementBridge\.uploadImage|contactCardFile|uploadContactCard/, `${name} still has an operational Blob reference`);
}

assert.doesNotMatch(announcementSource, /an-image-button|Ctrl\+V로 바로|이미지 업로드 중/, 'announcement image upload UI remains');
console.log('PASS: Vercel Blob package, APIs, client, and upload UI removed');
