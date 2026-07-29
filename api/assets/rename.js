const { rename } = require('@vercel/blob');
const { HttpError, sendError, verifyFirebaseAdmin } = require('../_firebase-admin');

const ALLOWED_SECTIONS = new Set(['driverApp', 'backtongApp', 'backtongPC', 'channelTalk']);

function sourcePathname(url) {
  let parsed;
  try {
    parsed = new URL(String(url || ''));
  } catch {
    throw new HttpError(400, '변경할 이미지 URL을 확인해 주세요.');
  }
  if (!parsed.hostname.endsWith('.blob.vercel-storage.com')) {
    throw new HttpError(400, 'Vercel Blob 이미지만 이름을 변경할 수 있습니다.');
  }
  return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
}

function validateName(value) {
  const name = String(value || '').trim();
  if (!name || name.length > 180) throw new HttpError(400, '새 파일명은 1~180자로 입력해 주세요.');
  if (name === '.' || name === '..' || /[\\/#?[\]*\u0000-\u001f]/.test(name)) {
    throw new HttpError(400, '파일명에 사용할 수 없는 문자가 포함되어 있습니다.');
  }
  return name;
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }
  try {
    await verifyFirebaseAdmin(request);
    const fromUrl = String(request.body?.url || '');
    const fromPath = sourcePathname(fromUrl);
    const parts = fromPath.split('/').filter(Boolean);
    if (parts.length < 3 || parts[0] !== 'simulator-images' || !ALLOWED_SECTIONS.has(parts[1])) {
      throw new HttpError(400, '시뮬레이터 업로드 이미지만 이름을 변경할 수 있습니다.');
    }
    const newName = validateName(request.body?.name);
    const toPath = [...parts.slice(0, -1), newName].join('/');
    if (toPath === fromPath) return response.status(200).json({ url: fromUrl, pathname: fromPath, name: newName });

    const renamed = await rename(fromUrl, toPath, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
    });
    return response.status(200).json({
      url: renamed.url,
      pathname: renamed.pathname,
      name: renamed.pathname.split('/').pop(),
    });
  } catch (error) {
    return sendError(response, error);
  }
};
