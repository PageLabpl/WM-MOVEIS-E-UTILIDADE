const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { query } = require('../config/db');
const { validate } = require('../middleware/validate');
const {
  signCustomerToken, setCustomerSessionCookie, clearCustomerSessionCookie, requireCustomerAuth
} = require('../middleware/customerAuth');

const router = express.Router();

/** POST /api/shop/auth/signup — cria uma conta de cliente com e-mail/senha. */
router.post(
  '/shop/auth/signup',
  [
    body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
    body('password').isString().isLength({ min: 6, max: 200 }).withMessage('A senha deve ter pelo menos 6 caracteres.'),
    body('name').optional({ nullable: true }).trim().isLength({ max: 150 })
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password, name } = req.body;
      const { rows: existing } = await query('SELECT id, password_hash FROM shop_customers WHERE email = $1', [email]);
      if (existing.length) {
        if (existing[0].password_hash) {
          return res.status(409).json({ error: 'Já existe uma conta com esse e-mail. Faça login.' });
        }
        return res.status(409).json({ error: 'Esse e-mail já está vinculado a uma conta do Google. Use "Entrar com Google".' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const { rows } = await query(
        `INSERT INTO shop_customers (email, password_hash, name) VALUES ($1, $2, $3)
         RETURNING id, email, name`,
        [email, passwordHash, name || null]
      );
      const customer = rows[0];
      const token = signCustomerToken(customer);
      setCustomerSessionCookie(res, token);
      res.status(201).json({ ok: true, customer });
    } catch (err) { next(err); }
  }
);

/** POST /api/shop/auth/login — login por e-mail/senha. */
router.post(
  '/shop/auth/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
    body('password').isString().isLength({ min: 1, max: 200 }).withMessage('Senha obrigatória.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const { rows } = await query(
        'SELECT id, email, name, password_hash FROM shop_customers WHERE email = $1',
        [email]
      );
      const customer = rows[0];
      const genericError = () => res.status(401).json({ error: 'E-mail ou senha inválidos.' });

      if (!customer) return genericError();
      if (!customer.password_hash) {
        return res.status(401).json({ error: 'Essa conta usa login com Google — clique em "Entrar com Google".' });
      }
      const ok = await bcrypt.compare(password, customer.password_hash);
      if (!ok) return genericError();

      await query('UPDATE shop_customers SET last_login_at = now() WHERE id = $1', [customer.id]);
      const token = signCustomerToken(customer);
      setCustomerSessionCookie(res, token);
      res.json({ ok: true, customer: { id: customer.id, email: customer.email, name: customer.name } });
    } catch (err) { next(err); }
  }
);

router.post('/shop/auth/logout', (req, res) => {
  clearCustomerSessionCookie(res);
  res.json({ ok: true });
});

router.get('/shop/auth/me', requireCustomerAuth, (req, res) => {
  res.json({ customer: req.customer });
});

/* ---------------- Login com Google ---------------- */

/** Precisa bater EXATAMENTE com uma "Authorized redirect URI" cadastrada
 *  no Google Cloud Console para o Client ID usado (ver GOOGLE_CLIENT_ID). */
function getGoogleRedirectUri(req) {
  return `${req.protocol}://${req.get('host')}/api/shop/auth/google/callback`;
}

router.get('/shop/auth/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).send('Login com Google não está configurado neste servidor.');
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: getGoogleRedirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account'
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/shop/auth/google/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect('/?shop_login=error');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: getGoogleRedirectUri(req),
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Google OAuth] falha ao trocar code por token:', tokenData);
      return res.redirect('/?shop_login=error');
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileRes.json();
    if (!profile.email) return res.redirect('/?shop_login=error');

    // Procura primeiro por google_id; se não achar, tenta linkar por e-mail
    // (caso a pessoa já tivesse uma conta criada com senha).
    let customer = (await query('SELECT id, email, name FROM shop_customers WHERE google_id = $1', [profile.id])).rows[0];

    if (!customer) {
      const byEmail = await query('SELECT id, email, name FROM shop_customers WHERE email = $1', [profile.email]);
      if (byEmail.rows.length) {
        await query('UPDATE shop_customers SET google_id = $1 WHERE id = $2', [profile.id, byEmail.rows[0].id]);
        customer = byEmail.rows[0];
      } else {
        customer = (await query(
          `INSERT INTO shop_customers (email, name, google_id) VALUES ($1, $2, $3)
           RETURNING id, email, name`,
          [profile.email, profile.name || null, profile.id]
        )).rows[0];
      }
    }

    await query('UPDATE shop_customers SET last_login_at = now() WHERE id = $1', [customer.id]);
    const token = signCustomerToken(customer);
    setCustomerSessionCookie(res, token);
    res.redirect('/?shop_login=ok');
  } catch (err) { next(err); }
});

module.exports = router;
