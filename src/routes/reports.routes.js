const express = require('express');
const { query: sqlQuery } = require('../config/db');
const { requireAuth, requireSuper, requirePermission } = require('../middleware/auth');

const router = express.Router();
const requireSalesReport = requirePermission('relvendas');

/** Lê o array de vendas guardado em app_data (chave wm_sales). */
async function loadSales() {
  const { rows } = await sqlQuery('SELECT value FROM app_data WHERE key = $1', ['wm_sales']);
  const value = rows.length ? rows[0].value : null;
  return Array.isArray(value) ? value : [];
}

/** GET /api/admin/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
 *  Retorna as vendas dentro do período (inclusive), com quem vendeu cada
 *  uma (campo soldBy, preenchido automaticamente no momento da venda).
 *  Cada consulta fica registrada em audit_log — dá pra ver depois quem
 *  gerou qual relatório e quando. */
router.get('/admin/reports/sales', requireAuth, requireSalesReport, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'Informe "from" e "to" no formato AAAA-MM-DD.' });
    }

    const fromTime = new Date(from + 'T00:00:00').getTime();
    const toTime = new Date(to + 'T23:59:59.999').getTime();
    if (fromTime > toTime) {
      return res.status(400).json({ error: '"from" precisa ser antes de "to".' });
    }

    const sales = await loadSales();
    const filtered = sales.filter(s => {
      const t = new Date(s.date).getTime();
      return Number.isFinite(t) && t >= fromTime && t <= toTime;
    });

    const totalGeral = filtered.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    await sqlQuery(
      `INSERT INTO audit_log (admin_id, action, entity, entity_id, ip)
       VALUES ($1, 'gerar_relatorio_vendas', 'sales_report', $2, $3)`,
      [req.admin.id, `${from}_a_${to}`, req.ip]
    );

    res.json({ from, to, total: totalGeral, count: filtered.length, sales: filtered });
  } catch (err) { next(err); }
});

/** GET /api/admin/reports/sales/audit — lista quem gerou relatórios de
 *  vendas e quando (só admins "super" veem isso — é uma checagem sobre a
 *  equipe, não uma função do dia a dia). */
router.get('/admin/reports/sales/audit', requireAuth, requireSuper, async (req, res, next) => {
  try {
    const { rows } = await sqlQuery(
      `SELECT a.created_at, a.entity_id AS periodo, adm.email AS gerado_por, a.ip
       FROM audit_log a
       LEFT JOIN admins adm ON adm.id = a.admin_id
       WHERE a.action = 'gerar_relatorio_vendas'
       ORDER BY a.created_at DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
