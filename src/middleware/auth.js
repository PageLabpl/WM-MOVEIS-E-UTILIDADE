const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

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

/** Exige um token de sessão válido. Busca as permissões ATUAIS no banco (não
 *  confia só no que estava no token) — assim, se um admin tiver o acesso
 *  revogado ou a conta excluída, isso vale imediatamente na próxima
 *  requisição, sem esperar o token expirar ou a pessoa deslogar.
 *  Anexa req.admin = { id, email, is_super, can_products, can_reports }. */
async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
  try {
    const { rows } = await query(
      'SELECT id, email, is_super, can_products, can_reports FROM admins WHERE id = $1',
      [payload.sub]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
    }
    req.admin = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

/** Exige que o admin autenticado seja "super" (gerencia outras contas). */
function requireSuper(req, res, next) {
  if (req.admin && req.admin.is_super) return next();
  return res.status(403).json({ error: 'Apenas um administrador principal pode fazer isso.' });
}

/** Exige uma permissão específica (ex: 'can_products', 'can_reports').
 *  Admins "super" sempre passam, independente das flags individuais. */
function requirePermission(perm) {
  return (req, res, next) => {
    if (req.admin && (req.admin.is_super || req.admin[perm])) return next();
    return res.status(403).json({ error: 'Você não tem permissão para acessar este recurso.' });
  };
}

module.exports = {
  COOKIE_NAME, signToken, setSessionCookie, clearSessionCookie,
  requireAuth, requireSuper, requirePermission
};
