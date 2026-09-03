/**
 * Chaves de dados do painel que são sincronizadas com o backend através das
 * rotas genéricas /api/admin/data/:key. Cada uma corresponde a uma seção do
 * painel (vendas, clientes, caixa, fiado, etc.).
 *
 * Produtos e o banner principal ficam de fora dessa lista de propósito —
 * eles têm tabelas próprias e endpoints dedicados (/api/products,
 * /api/admin/hero-banner) porque também são consumidos publicamente pelo site.
 * As chaves aqui são estritamente privadas/administrativas.
 */
const ALLOWED_DATA_KEYS = [
  'wm_customers',
  'wm_sales',
  'wm_returns',
  'wm_quotes',
  'wm_stock_movements',
  'wm_caixa',
  'wm_fiado',
  'wm_prolabore',
  'wm_prolabore_goal',
  'wm_mei_config',
  'wm_mei_das',
  'wm_goals',
  'wm_loyalty_config',
  'wm_melhor_envio_config',
  'wm_shipping_rules',
  'wm_company',
  'wm_service_banner'
];

module.exports = { ALLOWED_DATA_KEYS };
