-- ================================================================
-- WM Móveis & Utilidades — Schema do banco de dados (PostgreSQL)
-- Rode este script uma vez no seu banco (Render Postgres ou Supabase).
-- Também é aplicado automaticamente por scripts/migrate.js
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- necessário para gen_random_uuid()

CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_super      BOOLEAN NOT NULL DEFAULT false,      -- pode gerenciar outras contas de admin (bypassa todas as permissões abaixo)
  can_products  BOOLEAN NOT NULL DEFAULT true,       -- LEGADO: mantido só por compatibilidade, não é mais usado no código
  can_reports   BOOLEAN NOT NULL DEFAULT true,       -- LEGADO: mantido só por compatibilidade, não é mais usado no código
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- controle granular: { "produtos": true, "vendas": false, ... }
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);
-- Garante as colunas também em bancos que já tinham a tabela criada antes desta versão.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_super BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS can_products BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS can_reports BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Se o banco já tinha admins de antes desta versão (sem nenhum "super"),
-- promove o mais antigo automaticamente — evita que o dono original do
-- painel fique sem conseguir gerenciar as novas contas de equipe.
UPDATE admins SET is_super = true, can_products = true, can_reports = true
WHERE id = (SELECT id FROM admins ORDER BY created_at ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM admins WHERE is_super = true);

-- Migra o controle antigo (2 chaves: produtos/relatórios) para o novo formato
-- granular (uma chave por função do painel) — só roda em contas que ainda
-- não têm nada configurado em "permissions", pra não sobrescrever ajustes
-- finos que já tenham sido feitos manualmente depois desta atualização.
UPDATE admins SET permissions = jsonb_build_object(
  'produtos', can_products,
  'estoque', can_reports,
  'vendas', can_reports,
  'relvendas', can_reports,
  'devolucao', can_reports,
  'clientes', can_reports,
  'orcamentos', can_reports,
  'fiado', can_reports,
  'caixa', can_reports,
  'prolabore', can_reports,
  'mei', can_reports,
  'relatorios', can_reports,
  'relclientes', can_reports,
  'metas', can_reports,
  'frete', can_reports,
  'config', true
)
WHERE permissions = '{}'::jsonb;

CREATE TABLE IF NOT EXISTS login_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  ip           TEXT NOT NULL,
  success      BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clientes do SITE (quem compra) — totalmente separado da tabela "admins"
-- (quem gerencia o painel). password_hash fica NULL quando a conta só usa
-- login via Google.
CREATE TABLE IF NOT EXISTS shop_customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name          TEXT,
  google_id     TEXT UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts (email, ip, attempted_at);

CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'utilidades'
                CHECK (category IN ('sala','quarto','cozinha','banheiro','escritorio','decoracao','utilidades','organizacao')),
  sku           TEXT,
  price         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  cost          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  old_price     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (old_price >= 0),
  qty           INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  min_qty       INTEGER NOT NULL DEFAULT 0 CHECK (min_qty >= 0),
  description   TEXT NOT NULL DEFAULT '',
  video_url     TEXT NOT NULL DEFAULT '',
  images        JSONB NOT NULL DEFAULT '[]'::jsonb,
  colors        JSONB NOT NULL DEFAULT '[]'::jsonb,
  show_on_site  BOOLEAN NOT NULL DEFAULT true,
  rating        NUMERIC(2,1) NOT NULL DEFAULT 5.0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_show_on_site ON products (show_on_site);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

CREATE TABLE IF NOT EXISTS hero_banner (
  id        INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- linha única (singleton)
  image_url TEXT NOT NULL DEFAULT '',
  title     TEXT NOT NULL DEFAULT '',
  subtitle  TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO hero_banner (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Armazena o restante dos dados do painel (vendas, clientes, caixa, fiado,
-- pró-labore, MEI, orçamentos, devoluções, metas, config de frete/fidelidade
-- etc.) como documentos JSON, protegidos pelas mesmas camadas de autenticação,
-- CSRF e validação de chave usadas no resto da API. Produtos e o banner
-- principal (que são públicos, vistos pelo site) continuam em tabelas próprias
-- e estruturadas — isto aqui é só para os dados internos do seu negócio.
CREATE TABLE IF NOT EXISTS app_data (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT 'null'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log de auditoria simples das ações administrativas (defesa em profundidade / rastreabilidade)
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES admins(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
