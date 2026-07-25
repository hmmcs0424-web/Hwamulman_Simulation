const { del } = require('@vercel/blob');
const { HttpError, sendError, verifyFirebaseAdmin } = require('../_firebase-admin');

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }
  try {
    await verifyFirebaseAdmin(request);
    const urls = Array.isArray(request.body?.urls) ? request.body.urls : [];
    if (!urls.length || urls.length > 100) throw new HttpError(400, '삭제할 이미지 URL을 확인해 주세요.');
    if (urls.some(url => !String(url).includes('.blob.vercel-storage.com/'))) {
      throw new HttpError(400, 'Vercel Blob 이미지만 삭제할 수 있습니다.');
    }
    await del(urls);
    return response.status(200).json({ deleted: urls.length });
  } catch (error) {
    return sendError(response, error);
  }
};
