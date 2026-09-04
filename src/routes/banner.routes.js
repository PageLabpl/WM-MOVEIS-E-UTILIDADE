const express = require('express');
const { body } = require('express-validator');
const { query } = require('../config/db');
const { validate } = require('../middleware/validate');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();

router.get('/hero-banner', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT image_url, title, subtitle FROM hero_banner WHERE id = 1');
    res.json(rows[0] || { image_url: '', title: '', subtitle: '' });
  } catch (err) { next(err); }
});

router.put(
  '/admin/hero-banner',
  requireAuth,
  requirePermission('can_products'),
  requireCsrf,
  [
    body('image').optional({ nullable: true }).isString().isLength({ max: 3000 }),
    body('title').optional({ nullable: true }).trim().isLength({ max: 300 }),
    body('subtitle').optional({ nullable: true }).trim().isLength({ max: 300 })
  ],
  validate,
  async (req, res, next) => {
    try {
      const { image, title, subtitle } = req.body;
      const { rows } = await query(
        `UPDATE hero_banner SET
           image_url = COALESCE($1, image_url),
           title = COALESCE($2, title),
           subtitle = COALESCE($3, subtitle),
           updated_at = now()
         WHERE id = 1
         RETURNING image_url, title, subtitle`,
        [image ?? null, title ?? null, subtitle ?? null]
      );
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

module.exports = router;
