const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const HISTORY_SOURCE = '89267c5^';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']);
const PREFIX_TO_SECTION = {
  driverApp: '차주앱',
  backtongApp: '빽통앱',
  backtongPC: '빽통PC',
  channelTalk: '채널톡',
};

function normalize(value) {
  return String(value || '').normalize('NFC').toLocaleLowerCase('ko-KR');
}

function cleanUrl(value) {
  const parsed = new URL(value);
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
}

function trackedFilesAt(revision = null) {
  const args = ['-c', 'core.quotePath=false', 'ls-tree', '-r', '--name-only', '-z', revision || 'HEAD'];
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
}

function currentTrackedFiles() {
  return execFileSync('git', ['-c', 'core.quotePath=false', 'ls-files', '-z'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).split('\0').filter(Boolean);
}

function findHistoricalRevision(file) {
  const commits = execFileSync('git', ['log', '--all', '--format=%H', '--', file], {
    cwd: ROOT,
    encoding: 'utf8',
  }).split(/\r?\n/).filter(Boolean);
  for (const commit of commits) {
    try {
      execFileSync('git', ['cat-file', '-e', `${commit}:${file}`], { cwd: ROOT, stdio: 'ignore' });
      return commit;
    } catch (_) {
      // Continue until reaching the newest revision that still contains the file.
    }
  }
  return null;
}

function isImage(file) {
  return IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase());
}

function download(url, target) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        download(response.headers.location, target).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed ${response.statusCode}: ${url}`));
        return;
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const data = Buffer.concat(chunks);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, data);
        resolve(data.length);
      });
    });
    request.on('error', reject);
  });
}

(async () => {
  const codeAudit = readJson('blob-migration-audit.json');
  const liveAudit = readJson('blob-live-data-audit.json');
  const urls = new Set(codeAudit.mappings.map(item => cleanUrl(item.url)));
  liveAudit.urls.forEach(item => urls.add(cleanUrl(item.url)));

  const currentImages = currentTrackedFiles().filter(isImage).map(file => file.replace(/\\/g, '/').normalize('NFC'));
  const historicalImages = trackedFilesAt(HISTORY_SOURCE).filter(isImage).map(file => file.replace(/\\/g, '/').normalize('NFC'));
  const historicalSet = new Set(historicalImages.map(normalize));
  const restored = [];
  const downloaded = [];
  const mapping = {};
  const unresolved = [];

  for (const url of [...urls].sort()) {
    const parsed = new URL(url);
    const decodedPath = decodeURIComponent(parsed.pathname.replace(/^\/+/, '')).normalize('NFC');
    if (decodedPath.startsWith('simulator-images/')) {
      const [, prefix, ...restParts] = decodedPath.split('/');
      const section = PREFIX_TO_SECTION[prefix];
      if (!section || restParts.length === 0) continue;
      const rest = restParts.join('/');
      if (!rest || !IMAGE_EXTENSIONS.has(path.extname(rest).toLowerCase())) continue;
      const historicalPath = `${section}/${rest}`;
      let localPath = null;

      if (historicalSet.has(normalize(historicalPath))) {
        localPath = historicalImages.find(file => normalize(file) === normalize(historicalPath));
        const absolute = path.join(ROOT, localPath);
        if (!fs.existsSync(absolute)) {
          if (APPLY) {
            const data = execFileSync('git', ['show', `${HISTORY_SOURCE}:${localPath}`], { cwd: ROOT, encoding: null });
            fs.mkdirSync(path.dirname(absolute), { recursive: true });
            fs.writeFileSync(absolute, data);
          }
          restored.push(localPath);
        }
      } else {
        const historicalRevision = findHistoricalRevision(historicalPath);
        if (historicalRevision) {
          localPath = historicalPath;
          const absolute = path.join(ROOT, localPath);
          if (!fs.existsSync(absolute)) {
            if (APPLY) {
              const data = execFileSync('git', ['show', `${historicalRevision}:${localPath}`], { cwd: ROOT, encoding: null });
              fs.mkdirSync(path.dirname(absolute), { recursive: true });
              fs.writeFileSync(absolute, data);
            }
            restored.push(localPath);
          }
        }
        const sectionCandidates = currentImages.filter(file =>
          normalize(file).startsWith(`${normalize(section)}/`) &&
          normalize(path.posix.basename(file)) === normalize(path.posix.basename(rest))
        );
        if (!localPath && sectionCandidates.length === 1) localPath = sectionCandidates[0];
      }

      if (!localPath) {
        localPath = `migrated-blob-assets/${prefix}/${rest}`;
        const absolute = path.join(ROOT, localPath);
        if (APPLY && !fs.existsSync(absolute)) {
          const bytes = await download(url, absolute);
          downloaded.push({ localPath, bytes, type: 'simulator' });
        } else if (!fs.existsSync(absolute)) {
          downloaded.push({ localPath, bytes: null, type: 'simulator' });
        }
      }
      mapping[url] = localPath;
      continue;
    }

    if (decodedPath.startsWith('announcement-images/')) {
      const basename = path.posix.basename(decodedPath);
      const localPath = `announcement-images/${basename}`;
      const absolute = path.join(ROOT, localPath);
      if (APPLY && !fs.existsSync(absolute)) {
        const bytes = await download(url, absolute);
        downloaded.push({ localPath, bytes, type: 'announcement' });
      } else if (!fs.existsSync(absolute)) {
        downloaded.push({ localPath, bytes: null, type: 'announcement' });
      }
      mapping[url] = localPath;
      continue;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    apply: APPLY,
    sourceRevision: HISTORY_SOURCE,
    mappedUrlCount: Object.keys(mapping).length,
    restoredCount: restored.length,
    downloadedCount: downloaded.length,
    unresolvedCount: unresolved.length,
    restored,
    downloaded,
    unresolved,
    mapping,
  };
  fs.writeFileSync(path.join(ROOT, 'blob-migration-map.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (APPLY) {
    const pathMapping = Object.fromEntries(Object.entries(mapping).map(([url, localPath]) => {
      const parsed = new URL(url);
      return [decodeURIComponent(parsed.pathname.replace(/^\/+/, '')).normalize('NFC'), localPath];
    }));
    const reverseMapping = Object.fromEntries(Object.entries(pathMapping).map(([legacyPath, localPath]) => [localPath, legacyPath]));
    const browserSource = [
      `window.LEGACY_ASSET_PATH_MAP=Object.freeze(${JSON.stringify(pathMapping, null, 2)});`,
      `window.LEGACY_ASSET_REVERSE_MAP=Object.freeze(${JSON.stringify(reverseMapping, null, 2)});`,
      '',
    ].join('\n');
    fs.writeFileSync(path.join(ROOT, 'vendor', 'legacy-asset-map.js'), browserSource, 'utf8');
  }
  console.log(JSON.stringify({
    apply: APPLY,
    mappedUrlCount: report.mappedUrlCount,
    restoredCount: report.restoredCount,
    downloadedCount: report.downloadedCount,
    unresolvedCount: report.unresolvedCount,
  }, null, 2));
  if (unresolved.length) process.exitCode = 2;
})().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
