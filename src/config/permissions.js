/**
 * Catálogo central das permissões granulares do painel admin.
 * Cada chave corresponde a uma aba/função específica. Um admin "super"
 * sempre tem acesso a tudo, independente do que estiver aqui.
 *
 * IMPORTANTE: se adicionar uma nova chave aqui, adicione também no mesmo
 * formato em public/painel.html (função PERMISSION_DEFS do front-end),
 * senão a nova permissão não aparece na tela de gerenciar administradores.
 */
const PERMISSION_DEFS = [
  { key: 'produtos',   label: 'Produtos (catálogo, banner, upload de imagens)' },
  { key: 'estoque',    label: 'Movimentar estoque / Movimentações' },
  { key: 'vendas',     label: 'Registrar venda' },
  { key: 'relvendas',  label: 'Relatório de vendas por data (com quem vendeu)' },
  { key: 'devolucao',  label: 'Devolução' },
  { key: 'clientes',   label: 'Clientes' },
  { key: 'orcamentos', label: 'Orçamentos' },
  { key: 'fiado',      label: 'Fiado' },
  { key: 'caixa',      label: 'Caixa' },
  { key: 'prolabore',  label: 'Pró-labore' },
  { key: 'mei',        label: 'MEI' },
  { key: 'relatorios', label: 'Relatório DRE' },
  { key: 'relclientes',label: 'Relatório de clientes' },
  { key: 'metas',      label: 'Metas' },
  { key: 'frete',      label: 'Frete / Fidelidade' },
  { key: 'config',     label: 'Configurações (dados da empresa, banner de serviço)' }
];

const PERMISSION_KEYS = PERMISSION_DEFS.map(p => p.key);

/** Mapeia cada chave usada em /api/admin/data/:key para a permissão que a controla. */
const DATA_KEY_PERMISSION = {
  wm_customers: 'clientes',
  wm_sales: 'vendas',
  wm_returns: 'devolucao',
  wm_quotes: 'orcamentos',
  wm_stock_movements: 'estoque',
  wm_caixa: 'caixa',
  wm_fiado: 'fiado',
  wm_prolabore: 'prolabore',
  wm_prolabore_goal: 'prolabore',
  wm_mei_config: 'mei',
  wm_mei_das: 'mei',
  wm_goals: 'metas',
  wm_loyalty_config: 'frete',
  wm_melhor_envio_config: 'frete',
  wm_shipping_rules: 'frete',
  wm_company: 'config',
  wm_service_banner: 'config'
};

/** Verdadeiro se o admin pode acessar a função `key` (super sempre pode). */
function hasPermission(admin, key) {
  if (!admin) return false;
  if (admin.is_super) return true;
  return !!(admin.permissions && admin.permissions[key] === true);
}

module.exports = { PERMISSION_DEFS, PERMISSION_KEYS, DATA_KEY_PERMISSION, hasPermission };
