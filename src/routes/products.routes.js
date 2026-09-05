const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');
const ctrl = require('../controllers/products.controller');

const router = express.Router();
const requireProducts = requirePermission('produtos');

const VALID_CATEGORIES = ['sala','quarto','cozinha','banheiro','escritorio','decoracao','utilidades','organizacao'];

const productValidationRules = [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Nome deve ter entre 2 e 150 caracteres.'),
  body('category').isIn(VALID_CATEGORIES).withMessage('Categoria inválida.'),
  body('sku').optional({ nullable: true }).trim().isLength({ max: 60 }),
  body('price').isFloat({ min: 0, max: 10000000 }).withMessage('Preço inválido.'),
  body('cost').optional().isFloat({ min: 0, max: 10000000 }),
  body('oldPrice').optional().isFloat({ min: 0, max: 10000000 }),
  body('qty').optional().isInt({ min: 0, max: 1000000 }),
  body('minQty').optional().isInt({ min: 0, max: 1000000 }),
  body('description').optional().trim().isLength({ max: 4000 }),
  body('video').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('images').optional().isArray({ max: 10 }).withMessage('No máximo 10 imagens por produto.'),
  body('images.*').optional().isString().isLength({ max: 3000 }),
  body('colors').optional().isArray({ max: 12 }),
  body('colors.*.name').optional().isString().trim().isLength({ min: 1, max: 40 }),
  body('colors.*.hex').optional().isString().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Cor deve estar no formato hexadecimal (#rrggbb).'),
  body('showOnSite').optional().isBoolean()
];

const idParamRule = [ param('id').isUUID().withMessage('ID inválido.') ];

// ---- Rotas públicas (usadas pelo site) ----
router.get('/products', ctrl.listPublicProducts);
router.get('/products/:id', idParamRule, validate, ctrl.getPublicProduct);
router.get('/products/:id/related', idParamRule, validate, ctrl.getRelatedProducts);

// ---- Rotas administrativas (autenticação + permissão de produtos + CSRF obrigatórios) ----
router.get('/admin/products', requireAuth, requireProducts, ctrl.listAdminProducts);
router.post('/admin/products', requireAuth, requireProducts, requireCsrf, productValidationRules, validate, ctrl.createProduct);
router.put('/admin/products/:id', requireAuth, requireProducts, requireCsrf, [...idParamRule, ...productValidationRules], validate, ctrl.updateProduct);
router.delete('/admin/products/:id', requireAuth, requireProducts, requireCsrf, idParamRule, validate, ctrl.deleteProduct);

module.exports = router;
