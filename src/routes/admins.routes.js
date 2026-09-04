const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param } = require('express-validator');
const { query } = require('../config/db');
const { validate } = require('../middleware/validate');
const { requireAuth, requireSuper } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();

// Todas as rotas abaixo exigem login + ser admin "super" — só quem tem essa
// flag pode ver, criar, editar ou excluir outras contas de administrador.
router.use('/admin/admins', requireAuth, requireSuper);

/** GET /api/admin/admins — lista todas as contas de admin (sem o hash de senha). */
router.get('/admin/admins', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, email, is_super, can_products, can_reports, created_at, last_login_at
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
    body('canProducts').optional().isBoolean(),
    body('canReports').optional().isBoolean(),
    body('isSuper').optional().isBoolean()
  ],
  validate,
  async (req, res, next) => {
    try {
      const email = req.body.email;
      const canProducts = req.body.canProducts !== undefined ? !!req.body.canProducts : true;
      const canReports = req.body.canReports !== undefined ? !!req.body.canReports : false;
      const isSuper = !!req.body.isSuper;

      const { rows: existing } = await query('SELECT id FROM admins WHERE email = $1', [email]);
      if (existing.length) {
        return res.status(409).json({ error: 'Já existe um administrador com esse e-mail.' });
      }

      const passwordHash = await bcrypt.hash(req.body.password, 12);
      const { rows } = await query(
        `INSERT INTO admins (email, password_hash, is_super, can_products, can_reports)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, is_super, can_products, can_reports, created_at`,
        [email, passwordHash, isSuper, canProducts, canReports]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

/** PUT /api/admin/admins/:id — atualiza as permissões de uma conta existente. */
router.put(
  '/admin/admins/:id',
  requireCsrf,
  [
    param('id').isUUID().withMessage('ID inválido.'),
    body('canProducts').optional().isBoolean(),
    body('canReports').optional().isBoolean(),
    body('isSuper').optional().isBoolean()
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { canProducts, canReports, isSuper } = req.body;

      // Nunca deixa o painel ficar sem nenhum admin "super" (ninguém poderia
      // mais gerenciar contas depois disso).
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
           can_products = COALESCE($1, can_products),
           can_reports  = COALESCE($2, can_reports),
           is_super     = COALESCE($3, is_super)
         WHERE id = $4
         RETURNING id, email, is_super, can_products, can_reports`,
        [
          canProducts === undefined ? null : canProducts,
          canReports === undefined ? null : canReports,
          isSuper === undefined ? null : isSuper,
          id
        ]
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
