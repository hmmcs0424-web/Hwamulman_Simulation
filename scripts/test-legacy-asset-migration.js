const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const codeAudit = JSON.parse(fs.readFileSync(path.join(ROOT, 'blob-migration-audit.json'), 'utf8'));
const liveAudit = JSON.parse(fs.readFileSync(path.join(ROOT, 'blob-live-data-audit.json'), 'utf8'));
const migrationReport = JSON.parse(fs.readFileSync(path.join(ROOT, 'blob-migration-map.json'), 'utf8'));
const browserSource = fs.readFileSync(path.join(ROOT, 'vendor', 'legacy-asset-map.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(browserSource, sandbox);

const map = sandbox.window.LEGACY_ASSET_PATH_MAP;
const reverse = sandbox.window.LEGACY_ASSET_REVERSE_MAP;
const errors = [];

function legacyPathFromUrl(url) {
  const parsed = new URL(url);
  return decodeURIComponent(parsed.pathname.replace(/^\/+/, '')).normalize('NFC');
}

function looksLikeImage(buffer) {
  if (buffer.length < 12) return false;
  const hex = buffer.subarray(0, 12).toString('hex');
  const ascii = buffer.subarray(0, 12).toString('ascii');
  return hex.startsWith('89504e470d0a1a0a') ||
    hex.startsWith('ffd8ff') ||
    ascii.startsWith('GIF87a') ||
    ascii.startsWith('GIF89a') ||
    ascii.startsWith('RIFF') ||
    buffer.subarray(4, 12).toString('ascii').includes('ftypavif') ||
    buffer.subarray(0, 200).toString('utf8').includes('<svg');
}

const allAuditedUrls = new Set([
  ...codeAudit.mappings.map(item => item.url).filter(url => url.includes('rwuyelff504orri4.public.blob.vercel-storage.com/')),
  ...liveAudit.urls.map(item => item.url),
]);

for (const url of allAuditedUrls) {
  const legacyPath = legacyPathFromUrl(url);
  if (!path.extname(legacyPath)) continue;
  const localPath = map[legacyPath];
  if (!localPath) {
    errors.push(`매핑 없음: ${legacyPath}`);
    continue;
  }
  const absolute = path.join(ROOT, localPath);
  if (!fs.existsSync(absolute)) {
    errors.push(`파일 없음: ${localPath}`);
    continue;
  }
  const data = fs.readFileSync(absolute);
  if (!looksLikeImage(data)) errors.push(`이미지 형식 확인 실패: ${localPath}`);
  if (reverse[localPath] !== legacyPath) errors.push(`역방향 식별자 불일치: ${localPath}`);
}

const staticTargets = ['index.html', '차주앱/flow.json', '빽통앱/flow.json', '빽통PC/flow.json', '채널톡/교육_flow.json'];
for (const relative of staticTargets) {
  const text = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  if (/https:\/\/[^\s"'<>]+\.blob\.vercel-storage\.com\//.test(text)) {
    errors.push(`정적 Blob URL 잔존: ${relative}`);
  }
}

if (migrationReport.unresolvedCount !== 0) errors.push(`미해결 매핑 ${migrationReport.unresolvedCount}개`);

console.log(JSON.stringify({
  auditedUrlCount: allAuditedUrls.size,
  pathMapCount: Object.keys(map).length,
  verifiedImageCount: new Set(Object.values(map)).size,
  staticTargetCount: staticTargets.length,
  errorCount: errors.length,
  errors,
}, null, 2));

if (errors.length) process.exitCode = 1;
