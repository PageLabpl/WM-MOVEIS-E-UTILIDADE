const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { query } = require('../config/db');
const { validate } = require('../middleware/validate');
const { loginLimiter } = require('../middleware/rateLimiters');
const { signToken, setSessionCookie, clearSessionCookie, requireAuth } = require('../middleware/auth');
const { issueCsrfToken, requireCsrf } = require('../middleware/csrf');

const router = express.Router();

const LOCKOUT_WINDOW_MIN = 15;
const LOCKOUT_MAX_FAILURES = 6;

async function isLockedOut(email, ip) {
  const { rows } = await query(
    `SELECT count(*)::int AS failures
     FROM login_attempts
     WHERE email = $1 AND ip = $2 AND success = false
       AND attempted_at > now() - ($3 || ' minutes')::interval`,
    [email, ip, LOCKOUT_WINDOW_MIN]
  );
  return rows[0].failures >= LOCKOUT_MAX_FAILURES;
}

async function recordAttempt(email, ip, success) {
  await query(
    'INSERT INTO login_attempts (email, ip, success) VALUES ($1, $2, $3)',
    [email, ip, success]
  );
}

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
    body('password').isString().isLength({ min: 1, max: 200 }).withMessage('Senha obrigatória.')
  ],
  validate,
  async (req, res, next) => {
    const { email, password } = req.body;
    const ip = req.ip;

    try {
      if (await isLockedOut(email, ip)) {
        return res.status(429).json({
          error: `Muitas tentativas com falha. Aguarde ${LOCKOUT_WINDOW_MIN} minutos e tente novamente.`
        });
      }

      const { rows } = await query('SELECT id, email, password_hash, is_super, permissions FROM admins WHERE email = $1', [email]);
      const admin = rows[0];

      // Mensagem genérica proposital: não revela se o e-mail existe ou não (evita enumeração de contas).
      const genericError = () => res.status(401).json({ error: 'E-mail ou senha inválidos.' });

      if (!admin) {
        await recordAttempt(email, ip, false);
        return genericError();
      }

      const passwordOk = await bcrypt.compare(password, admin.password_hash);
      if (!passwordOk) {
        await recordAttempt(email, ip, false);
        return genericError();
      }

      await recordAttempt(email, ip, true);
      await query('UPDATE admins SET last_login_at = now() WHERE id = $1', [admin.id]);

      const token = signToken(admin);
      setSessionCookie(res, token);
      issueCsrfToken(req, res, () => {
        res.json({
          ok: true,
          admin: {
            id: admin.id,
            email: admin.email,
            is_super: admin.is_super,
            permissions: admin.permissions
          },
          csrfToken: res.locals.csrfToken
        });
      });
    } catch (err) {
      next(err);
    }
  }
);

/** PUT /api/auth/password — troca a senha do admin autenticado.
 *  Exige a senha atual (evita que uma sessão roubada troque a senha sem
 *  saber a original) e grava só o novo hash bcrypt — nunca texto puro.
 *  Ao gravar no banco, a mudança já vale para qualquer dispositivo/sessão
 *  futura que fizer login, não só para o navegador onde foi trocada. */
router.put(
  '/password',
  requireAuth,
  requireCsrf,
  [
    body('currentPassword').isString().isLength({ min: 1, max: 200 }).withMessage('Senha atual obrigatória.'),
    body('newPassword').isString().isLength({ min: 10, max: 200 }).withMessage('A nova senha deve ter pelo menos 10 caracteres.')
  ],
  validate,
  async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    try {
      const { rows } = await query('SELECT id, password_hash FROM admins WHERE id = $1', [req.admin.id]);
      const admin = rows[0];
      if (!admin) {
        return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
      }

      const currentOk = await bcrypt.compare(currentPassword, admin.password_hash);
      if (!currentOk) {
        return res.status(401).json({ error: 'Senha atual incorreta.' });
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      await query('UPDATE admins SET password_hash = $1 WHERE id = $2', [newHash, admin.id]);

      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.clearCookie('wm_csrf', { path: '/' });
  res.json({ ok: true });
});

router.get('/me', requireAuth, issueCsrfToken, (req, res) => {
  res.json({ admin: req.admin, csrfToken: res.locals.csrfToken });
});

module.exports = router;
