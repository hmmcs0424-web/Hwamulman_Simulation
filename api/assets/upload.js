const { handleUpload } = require('@vercel/blob/client');
const { HttpError, sendError, verifyFirebaseAdmin } = require('../_firebase-admin');

const ALLOWED_PREFIXES = new Set(['driverApp', 'backtongApp', 'backtongPC', 'channelTalk']);
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];

function validatePathname(pathname) {
  const normalized = String(pathname || '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  const isAnnouncement = parts.length >= 2 && parts[0] === 'announcement-images';
  const isContactCard = parts.length >= 2 && parts[0] === 'contact-card-images';
  const isSimulator = (
    parts.length >= 3 &&
    parts[0] === 'simulator-images' &&
    ALLOWED_PREFIXES.has(parts[1])
  );
  if (
    (!isAnnouncement && !isContactCard && !isSimulator) ||
    parts.some(part => part === '.' || part === '..')
  ) {
    throw new HttpError(400, '허용되지 않은 이미지 경로입니다.');
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }
  try {
    const result = await handleUpload({
      request,
      body: request.body,
      onBeforeGenerateToken: async pathname => {
        await verifyFirebaseAdmin(request);
        validatePathname(pathname);
        return {
          allowedContentTypes: IMAGE_TYPES,
          maximumSizeInBytes: 15 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 60,
        };
      },
    });
    return response.status(200).json(result);
  } catch (error) {
    return sendError(response, error);
  }
};
