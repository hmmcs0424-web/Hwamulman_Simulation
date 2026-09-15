const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const PROJECT_ID = 'hmm-work-guide';
const COLLECTIONS = ['announcements', 'simulatorFlows', 'guides', 'guideFlows'];
const BLOB_URL_RE = /https:\/\/[^\s"'<>]+\.blob\.vercel-storage\.com\/[^\s"'<>]+/g;

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`${response.statusCode} ${url}: ${body.slice(0, 300)}`));
          return;
        }
        try { resolve(JSON.parse(body)); }
        catch (error) { reject(new Error(`JSON parse failed for ${url}: ${error.message}`)); }
      });
    }).on('error', reject);
  });
}

async function readCollection(collection) {
  const documents = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ pageSize: '100' });
    if (pageToken) query.set('pageToken', pageToken);
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?${query}`;
    const page = await requestJson(url);
    documents.push(...(page.documents || []));
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  return documents;
}

function collectBlobUrls(value, fieldPath = '$', found = []) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(BLOB_URL_RE)) {
      const parsed = new URL(match[0]);
      parsed.search = '';
      parsed.hash = '';
      found.push({ url: parsed.toString(), fieldPath });
    }
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectBlobUrls(item, `${fieldPath}[${index}]`, found));
    return found;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => collectBlobUrls(item, `${fieldPath}.${key}`, found));
  }
  return found;
}

(async () => {
  const collections = [];
  const uniqueUrls = new Map();
  for (const collection of COLLECTIONS) {
    const documents = await readCollection(collection);
    const references = [];
    for (const document of documents) {
      const documentId = document.name.split('/').pop();
      for (const item of collectBlobUrls(document.fields || {})) {
        const reference = { documentId, fieldPath: item.fieldPath, url: item.url };
        references.push(reference);
        if (!uniqueUrls.has(item.url)) uniqueUrls.set(item.url, []);
        uniqueUrls.get(item.url).push({ collection, documentId, fieldPath: item.fieldPath });
      }
    }
    collections.push({ collection, documentCount: documents.length, blobReferenceCount: references.length, references });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    collections,
    uniqueBlobUrlCount: uniqueUrls.size,
    urls: [...uniqueUrls.entries()].map(([url, references]) => ({ url, references })),
    protectedCollectionsNotRead: ['businessContacts'],
  };
  const output = path.join(ROOT, 'blob-live-data-audit.json');
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    report: path.relative(ROOT, output),
    uniqueBlobUrlCount: report.uniqueBlobUrlCount,
    collections: collections.map(item => ({
      collection: item.collection,
      documentCount: item.documentCount,
      blobReferenceCount: item.blobReferenceCount,
    })),
    protectedCollectionsNotRead: report.protectedCollectionsNotRead,
  }, null, 2));
})().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
