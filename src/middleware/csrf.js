const crypto = require('crypto');

const CSRF_COOKIE = 'wm_csrf';
const CSRF_HEADER = 'x-csrf-token';

/** Gera e envia um token CSRF legível por JS (não é sensível por si só;
 *  sua função é provar que a requisição partiu do próprio front-end). */
function issueCsrfToken(req, res, next) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
  });
  res.locals.csrfToken = token;
  next();
}

/** Exige que o header X-CSRF-Token bata com o cookie wm_csrf (double-submit). */
function requireCsrf(req, res, next) {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Token CSRF ausente ou inválido.' });
  }
  next();
}

module.exports = { CSRF_COOKIE, CSRF_HEADER, issueCsrfToken, requireCsrf };
