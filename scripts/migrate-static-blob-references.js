const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'blob-migration-map.json'), 'utf8'));
const mapping = new Map(Object.entries(report.mapping));
const targets = [
  'index.html',
  '차주앱/flow.json',
  '빽통앱/flow.json',
  '빽통PC/flow.json',
  '채널톡/교육_flow.json',
];
const urlPattern = /https:\/\/[^\s"'<>]+\.blob\.vercel-storage\.com\/[^\s"'<>]+/g;

let replacementCount = 0;
for (const relative of targets) {
  const absolute = path.join(ROOT, relative);
  const original = fs.readFileSync(absolute, 'utf8');
  const updated = original.replace(urlPattern, value => {
    const parsed = new URL(value);
    const suffix = `${parsed.search}${parsed.hash}`;
    parsed.search = '';
    parsed.hash = '';
    const replacement = mapping.get(parsed.toString());
    if (!replacement) return value;
    replacementCount += 1;
    return `${replacement}${suffix}`;
  });
  if (updated !== original) fs.writeFileSync(absolute, updated, 'utf8');
}

console.log(JSON.stringify({ targets, replacementCount }, null, 2));
