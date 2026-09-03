const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'wm_session';

function signToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h', algorithm: 'HS256' }
  );
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,                                   // JS do navegador nunca lê o token (mitiga roubo via XSS)
    secure: process.env.COOKIE_SECURE !== 'false',     // exige HTTPS em produção
    sameSite: 'strict',                                // mitiga CSRF em navegadores modernos
    maxAge: 8 * 60 * 60 * 1000,                        // 8 horas
    path: '/'
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** Exige um token de sessão válido. Anexa req.admin = { id, email }. */
function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.admin = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

module.exports = { COOKIE_NAME, signToken, setSessionCookie, clearSessionCookie, requireAuth };
