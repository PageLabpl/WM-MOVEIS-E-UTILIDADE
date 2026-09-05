const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param } = require('express-validator');
const { query } = require('../config/db');
const { validate } = require('../middleware/validate');
const { requireAuth, requireSuper } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');
const { PERMISSION_DEFS, PERMISSION_KEYS } = require('../config/permissions');

const router = express.Router();

// Todas as rotas abaixo exigem login + ser admin "super" — só quem tem essa
// flag pode ver, criar, editar ou excluir outras contas de administrador.
router.use('/admin/admins', requireAuth, requireSuper);

/** Monta um objeto de permissões válido a partir do que veio no corpo da
 *  requisição, ignorando qualquer chave que não exista no catálogo. */
function sanitizePermissions(input) {
  const out = {};
  if (input && typeof input === 'object') {
    for (const key of PERMISSION_KEYS) {
      if (typeof input[key] === 'boolean') out[key] = input[key];
    }
  }
  return out;
}

/** GET /api/admin/admins/permission-catalog — lista as permissões disponíveis
 *  (pra montar a tabela no front-end sem duplicar a lista manualmente). */
router.get('/admin/admins/permission-catalog', (req, res) => {
  res.json(PERMISSION_DEFS);
});

/** GET /api/admin/admins — lista todas as contas de admin (sem o hash de senha). */
router.get('/admin/admins', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, email, is_super, permissions, created_at, last_login_at
       FROM admins ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/** POST /api/admin/admins — cria uma nova conta de admin com permissões escolhidas. */
router.post(
  '/admin/admins',
  requireCsrf,
  [
    body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
    body('password').isString().isLength({ min: 10, max: 200 }).withMessage('A senha deve ter pelo menos 10 caracteres.'),
    body('isSuper').optional().isBoolean(),
    body('permissions').optional().isObject()
  ],
  validate,
  async (req, res, next) => {
    try {
      const email = req.body.email;
      const isSuper = !!req.body.isSuper;
      const permissions = sanitizePermissions(req.body.permissions);

      const { rows: existing } = await query('SELECT id FROM admins WHERE email = $1', [email]);
      if (existing.length) {
        return res.status(409).json({ error: 'Já existe um administrador com esse e-mail.' });
      }

      const passwordHash = await bcrypt.hash(req.body.password, 12);
      const { rows } = await query(
        `INSERT INTO admins (email, password_hash, is_super, permissions)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING id, email, is_super, permissions, created_at`,
        [email, passwordHash, isSuper, JSON.stringify(permissions)]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

/** PUT /api/admin/admins/:id — atualiza permissões (mescla com as já existentes)
 *  e/ou o status de "super" de uma conta existente. */
router.put(
  '/admin/admins/:id',
  requireCsrf,
  [
    param('id').isUUID().withMessage('ID inválido.'),
    body('isSuper').optional().isBoolean(),
    body('permissions').optional().isObject()
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isSuper } = req.body;
      const permsPatch = sanitizePermissions(req.body.permissions);

      // Nunca deixa o painel ficar sem nenhum admin "super".
      if (isSuper === false) {
        const { rows: supers } = await query(
          'SELECT count(*)::int AS n FROM admins WHERE is_super = true AND id != $1',
          [id]
        );
        if (supers[0].n === 0) {
          return res.status(400).json({ error: 'Precisa existir pelo menos um administrador principal (super).' });
        }
      }

      const { rows } = await query(
        `UPDATE admins SET
           permissions = permissions || $1::jsonb,
           is_super    = COALESCE($2, is_super)
         WHERE id = $3
         RETURNING id, email, is_super, permissions`,
        [JSON.stringify(permsPatch), isSuper === undefined ? null : isSuper, id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Administrador não encontrado.' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

/** DELETE /api/admin/admins/:id — remove uma conta de admin. */
router.delete(
  '/admin/admins/:id',
  requireCsrf,
  [ param('id').isUUID().withMessage('ID inválido.') ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (id === req.admin.id) {
        return res.status(400).json({ error: 'Você não pode excluir a própria conta enquanto está logado nela.' });
      }

      const { rows: target } = await query('SELECT is_super FROM admins WHERE id = $1', [id]);
      if (!target.length) return res.status(404).json({ error: 'Administrador não encontrado.' });

      if (target[0].is_super) {
        const { rows: supers } = await query(
          'SELECT count(*)::int AS n FROM admins WHERE is_super = true AND id != $1',
          [id]
        );
        if (supers[0].n === 0) {
          return res.status(400).json({ error: 'Precisa existir pelo menos um administrador principal (super).' });
        }
      }

      await query('DELETE FROM admins WHERE id = $1', [id]);
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

module.exports = router;
