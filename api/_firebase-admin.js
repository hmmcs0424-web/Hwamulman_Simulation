const FIREBASE_API_KEY = 'AIzaSyCS8wF_cqijeEenTCkmg7gmcajDJgIbB3w';
const FIREBASE_PROJECT_ID = 'hmm-work-guide';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function bearerToken(request) {
  const header = request.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, '관리자 로그인이 필요합니다.');
  return match[1];
}

async function verifyFirebaseAdmin(request) {
  const idToken = bearerToken(request);
  const identityResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!identityResponse.ok) throw new HttpError(401, 'Firebase 로그인 토큰이 유효하지 않습니다.');

  const identity = await identityResponse.json();
  const user = identity.users?.[0];
  if (!user?.localId) throw new HttpError(401, 'Firebase 사용자를 확인할 수 없습니다.');

  const adminResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/admins/${encodeURIComponent(user.localId)}`,
    { headers: { authorization: `Bearer ${idToken}` } },
  );
  if (!adminResponse.ok) throw new HttpError(403, '관리자 권한을 확인할 수 없습니다.');

  const adminDocument = await adminResponse.json();
  if (adminDocument.fields?.admin?.booleanValue !== true) {
    throw new HttpError(403, '관리자 권한이 등록되지 않은 계정입니다.');
  }
  return { uid: user.localId, email: user.email || '' };
}

function sendError(response, error) {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  response.status(status).json({ error: error.message || '서버 오류가 발생했습니다.' });
}

module.exports = { HttpError, sendError, verifyFirebaseAdmin };
