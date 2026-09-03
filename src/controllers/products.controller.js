const { query } = require('../config/db');

function toPublicProduct(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    price: Number(row.price),
    oldPrice: Number(row.old_price),
    rating: Number(row.rating),
    reviews: row.reviews_count,
    images: row.images,
    video: row.video_url,
    colors: row.colors,
    description: row.description
  };
}

function toAdminProduct(row) {
  return {
    ...toPublicProduct(row),
    sku: row.sku,
    cost: Number(row.cost),
    qty: row.qty,
    minQty: row.min_qty,
    showOnSite: row.show_on_site,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/** GET /api/products — catálogo público (somente produtos visíveis, sem dados sensíveis) */
async function listPublicProducts(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT * FROM products WHERE show_on_site = true ORDER BY created_at DESC'
    );
    res.json(rows.map(toPublicProduct));
  } catch (err) { next(err); }
}

/** GET /api/products/:id — detalhe público de um produto (somente se visível) */
async function getPublicProduct(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT * FROM products WHERE id = $1 AND show_on_site = true',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Produto não encontrado.' });
    res.json(toPublicProduct(rows[0]));
  } catch (err) { next(err); }
}

/** GET /api/products/:id/related — produtos relacionados (mesma categoria) */
async function getRelatedProducts(req, res, next) {
  try {
    const { rows: current } = await query('SELECT category FROM products WHERE id = $1', [req.params.id]);
    if (!current.length) return res.json([]);

    const { rows } = await query(
      `SELECT * FROM products
       WHERE show_on_site = true AND id != $1
       ORDER BY (category = $2) DESC, created_at DESC
       LIMIT 6`,
      [req.params.id, current[0].category]
    );
    res.json(rows.map(toPublicProduct));
  } catch (err) { next(err); }
}

/** GET /api/admin/products — lista completa para o painel (autenticado) */
async function listAdminProducts(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows.map(toAdminProduct));
  } catch (err) { next(err); }
}

/** POST /api/admin/products — cria produto */
async function createProduct(req, res, next) {
  try {
    const p = req.body;
    const { rows } = await query(
      `INSERT INTO products
        (name, category, sku, price, cost, old_price, qty, min_qty, description, video_url, images, colors, show_on_site)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        p.name, p.category, p.sku || null, p.price, p.cost || 0, p.oldPrice || 0,
        p.qty || 0, p.minQty || 0, p.description || '', p.video || '',
        JSON.stringify(p.images || []), JSON.stringify(p.colors || []),
        p.showOnSite !== false
      ]
    );
    await logAudit(req, 'create', 'product', rows[0].id);
    res.status(201).json(toAdminProduct(rows[0]));
  } catch (err) { next(err); }
}

/** PUT /api/admin/products/:id — atualiza produto */
async function updateProduct(req, res, next) {
  try {
    const p = req.body;
    const { rows } = await query(
      `UPDATE products SET
        name=$1, category=$2, sku=$3, price=$4, cost=$5, old_price=$6,
        qty=$7, min_qty=$8, description=$9, video_url=$10, images=$11,
        colors=$12, show_on_site=$13, updated_at=now()
       WHERE id=$14
       RETURNING *`,
      [
        p.name, p.category, p.sku || null, p.price, p.cost || 0, p.oldPrice || 0,
        p.qty || 0, p.minQty || 0, p.description || '', p.video || '',
        JSON.stringify(p.images || []), JSON.stringify(p.colors || []),
        p.showOnSite !== false, req.params.id
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Produto não encontrado.' });
    await logAudit(req, 'update', 'product', req.params.id);
    res.json(toAdminProduct(rows[0]));
  } catch (err) { next(err); }
}

/** DELETE /api/admin/products/:id */
async function deleteProduct(req, res, next) {
  try {
    const { rowCount } = await query('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Produto não encontrado.' });
    await logAudit(req, 'delete', 'product', req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function logAudit(req, action, entity, entityId) {
  try {
    await query(
      'INSERT INTO audit_log (admin_id, action, entity, entity_id, ip) VALUES ($1,$2,$3,$4,$5)',
      [req.admin?.id || null, action, entity, String(entityId), req.ip]
    );
  } catch (e) {
    console.error('Falha ao gravar audit_log:', e.message);
  }
}

module.exports = {
  listPublicProducts, getPublicProduct, getRelatedProducts,
  listAdminProducts, createProduct, updateProduct, deleteProduct
};
