const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const COOKIE_NAME = 'ev_session';
const SECRET = process.env.APP_SECRET || 'dev-secret-change-me';

function signSession(user) {
  // user: { id, nom_utilisateur, nom_complet }
  const token = jwt.sign(
    { sub: user.id, nom_utilisateur: user.nom_utilisateur, nom_complet: user.nom_complet },
    SECRET,
    { expiresIn: '12h' }
  );
  return cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

function clearSessionCookie() {
  return cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

function getSessionUser(event) {
  const header = event.headers.cookie || event.headers.Cookie || '';
  const cookies = cookie.parse(header);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET);
    return { id: payload.sub, nom_utilisateur: payload.nom_utilisateur, nom_complet: payload.nom_complet };
  } catch (e) {
    return null;
  }
}

function isAuthenticated(event) {
  return !!getSessionUser(event);
}

function requireAuth(event) {
  if (!isAuthenticated(event)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Session expirée ou absente. Veuillez vous reconnecter.' }),
    };
  }
  return null;
}

module.exports = { signSession, clearSessionCookie, isAuthenticated, requireAuth, getSessionUser, COOKIE_NAME };
