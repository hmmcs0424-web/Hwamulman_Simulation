const { list } = require('@vercel/blob');
const { HttpError, sendError, verifyFirebaseAdmin } = require('../_firebase-admin');

const ALLOWED_SECTIONS = new Set(['driverApp', 'backtongApp', 'backtongPC', 'channelTalk']);

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'GET 요청만 지원합니다.' });
  }
  try {
    await verifyFirebaseAdmin(request);
    const section = String(request.query.section || '');
    if (!ALLOWED_SECTIONS.has(section)) throw new HttpError(400, '허용되지 않은 이미지 분류입니다.');

    const prefix = `simulator-images/${section}/`;
    let cursor;
    const blobs = [];
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      blobs.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    return response.status(200).json({
      assets: blobs.map(blob => ({
        pathname: blob.pathname,
        url: blob.url,
        name: blob.pathname.split('/').pop(),
        size: blob.size,
        uploadedAt: blob.uploadedAt,
      })),
    });
  } catch (error) {
    return sendError(response, error);
  }
};
