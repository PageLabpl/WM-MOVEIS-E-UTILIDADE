const express = require('express');
const { param, body } = require('express-validator');
const { query } = require('../config/db');
const { ALLOWED_DATA_KEYS } = require('../config/allowedDataKeys');
const { DATA_KEY_PERMISSION, hasPermission } = require('../config/permissions');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();

const keyParamRule = [
  param('key').isIn(ALLOWED_DATA_KEYS).withMessage('Chave de dados desconhecida.')
];

/** Cada chave de dado é controlada por uma permissão diferente (ex: wm_sales
 *  exige a permissão "vendas", wm_caixa exige "caixa"...) — ver
 *  src/config/permissions.js para o mapeamento completo. */
function requireKeyPermission(req, res, next) {
  const perm = DATA_KEY_PERMISSION[req.params.key];
  if (perm && hasPermission(req.admin, perm)) return next();
  return res.status(403).json({ error: 'Você não tem permissão para acessar esses dados.' });
}

/** GET /api/admin/data — retorna todas as chaves de uma vez (usado para
 *  sincronizar o cache local do painel logo após o login). Retorna só as
 *  chaves para as quais o admin logado tem permissão — as demais vêm
 *  omitidas do resultado, sem gerar erro (evita quebrar o boot do painel
 *  pra quem tem acesso parcial). */
router.get('/admin/data', requireAuth, async (req, res, next) => {
  try {
    const allowedKeys = ALLOWED_DATA_KEYS.filter(k => hasPermission(req.admin, DATA_KEY_PERMISSION[k]));
    if (!allowedKeys.length) return res.json({});
    const { rows } = await query(
      'SELECT key, value FROM app_data WHERE key = ANY($1::text[])',
      [allowedKeys]
    );
    const result = {};
    rows.forEach(r => { result[r.key] = r.value; });
    res.json(result);
  } catch (err) { next(err); }
});

/** GET /api/admin/data/:key — retorna uma chave específica */
router.get('/admin/data/:key', requireAuth, keyParamRule, validate, requireKeyPermission, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT value FROM app_data WHERE key = $1', [req.params.key]);
    res.json(rows.length ? rows[0].value : null);
  } catch (err) { next(err); }
});

/** PUT /api/admin/data/:key — substitui o valor inteiro de uma chave.
 *  O corpo da requisição É o valor (array/objeto), sem envelope — assim o
 *  painel só precisa enviar exatamente o mesmo JSON que já guardava no
 *  localStorage. Limite de tamanho generoso, mas não ilimitado. */
router.put(
  '/admin/data/:key',
  requireAuth,
  keyParamRule,
  validate,
  requireKeyPermission,
  requireCsrf,
  body().custom((value) => {
    const size = JSON.stringify(value ?? null).length;
    if (size > 2_000_000) throw new Error('Dados grandes demais para essa chave (limite de ~2MB).');
    return true;
  }),
  validate,
  async (req, res, next) => {
    try {
      await query(
        `INSERT INTO app_data (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [req.params.key, JSON.stringify(req.body ?? null)]
      );
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

module.exports = router;
