const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const CUSTOMER_COOKIE = 'wm_shop_session';

function signCustomerToken(customer) {
  return jwt.sign(
    { sub: customer.id, email: customer.email },
    process.env.JWT_SECRET,
    { expiresIn: '30d', algorithm: 'HS256' }
  );
}

function setCustomerSessionCookie(res, token) {
  res.cookie(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    // 'lax' (não 'strict' como no admin): o retorno do login do Google chega
    // como uma navegação de topo vinda de accounts.google.com — com
    // 'strict' o cookie não seria enviado nesse redirecionamento.
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias — cliente de loja fica logado por mais tempo que admin
    path: '/'
  });
}

function clearCustomerSessionCookie(res) {
  res.clearCookie(CUSTOMER_COOKIE, { path: '/' });
}

/** Exige sessão de CLIENTE válida (não confundir com requireAuth, que é
 *  dos admins do painel — são cookies e tabelas totalmente separados). */
async function requireCustomerAuth(req, res, next) {
  const token = req.cookies?.[CUSTOMER_COOKIE];
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
  try {
    const { rows } = await query('SELECT id, email, name FROM shop_customers WHERE id = $1', [payload.sub]);
    if (!rows.length) return res.status(401).json({ error: 'Sessão inválida.' });
    req.customer = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  CUSTOMER_COOKIE, signCustomerToken, setCustomerSessionCookie, clearCustomerSessionCookie, requireCustomerAuth
};
