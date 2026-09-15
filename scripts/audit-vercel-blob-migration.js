const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']);
const TEXT_EXTENSIONS = new Set(['.html', '.json', '.js', '.jsx', '.css', '.md', '.txt']);
const BLOB_URL_RE = /https:\/\/[^\s"'<>]+\.blob\.vercel-storage\.com\/[^\s"'<>]+/g;

function normalize(value) {
  return String(value || '').normalize('NFC').toLocaleLowerCase('ko-KR');
}

function trackedFiles() {
  return execFileSync('git', ['-c', 'core.quotePath=false', 'ls-files', '-z'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).split('\0').filter(Boolean);
}

function cleanBlobUrl(value) {
  const parsed = new URL(value);
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function decodedBlobPath(value) {
  const parsed = new URL(value);
  return decodeURIComponent(parsed.pathname.replace(/^\/+/, '')).normalize('NFC');
}

const files = trackedFiles();
const images = files.filter(file => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()));
const imageDetails = images.map(file => {
  const absolute = path.join(ROOT, file);
  return {
    file: file.replace(/\\/g, '/').normalize('NFC'),
    basename: path.basename(file).normalize('NFC'),
    bytes: fs.statSync(absolute).size,
  };
});

const byBasename = new Map();
for (const image of imageDetails) {
  const key = normalize(image.basename);
  if (!byBasename.has(key)) byBasename.set(key, []);
  byBasename.get(key).push(image);
}

const references = new Map();
for (const file of files) {
  if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
  const absolute = path.join(ROOT, file);
  const text = fs.readFileSync(absolute, 'utf8');
  for (const match of text.matchAll(BLOB_URL_RE)) {
    const url = cleanBlobUrl(match[0]);
    if (!references.has(url)) references.set(url, []);
    const line = text.slice(0, match.index).split('\n').length;
    references.get(url).push({ file: file.replace(/\\/g, '/'), line });
  }
}

const mappings = [...references.entries()].map(([url, refs]) => {
  const blobPath = decodedBlobPath(url);
  const basename = path.posix.basename(blobPath);
  const candidates = byBasename.get(normalize(basename)) || [];
  return { url, blobPath, basename, candidates, references: refs };
});

const report = {
  generatedAt: new Date().toISOString(),
  trackedFileCount: files.length,
  trackedImageCount: images.length,
  trackedImageBytes: imageDetails.reduce((sum, image) => sum + image.bytes, 0),
  blobReferenceCount: [...references.values()].reduce((sum, refs) => sum + refs.length, 0),
  uniqueBlobUrlCount: mappings.length,
  exactSingleCandidateCount: mappings.filter(item => item.candidates.length === 1).length,
  missingCount: mappings.filter(item => item.candidates.length === 0).length,
  ambiguousCount: mappings.filter(item => item.candidates.length > 1).length,
  missing: mappings.filter(item => item.candidates.length === 0),
  ambiguous: mappings.filter(item => item.candidates.length > 1),
  mappings,
};

const output = path.join(ROOT, 'blob-migration-audit.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  report: path.relative(ROOT, output),
  trackedFileCount: report.trackedFileCount,
  trackedImageCount: report.trackedImageCount,
  trackedImageMB: Number((report.trackedImageBytes / 1024 / 1024).toFixed(2)),
  blobReferenceCount: report.blobReferenceCount,
  uniqueBlobUrlCount: report.uniqueBlobUrlCount,
  exactSingleCandidateCount: report.exactSingleCandidateCount,
  missingCount: report.missingCount,
  ambiguousCount: report.ambiguousCount,
}, null, 2));

if (report.missingCount || report.ambiguousCount) process.exitCode = 2;
