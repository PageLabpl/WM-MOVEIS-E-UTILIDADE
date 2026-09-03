# WM Móveis & Utilidades — Backend + Painel + Site

API segura em Node.js + Express + PostgreSQL que agora cobre **todo** o
painel administrativo (produtos, banner, vendas, clientes, estoque, caixa,
fiado, pró-labore, MEI, orçamentos, devoluções, metas, configurações) — além
de servir o próprio site e o painel como arquivos estáticos, tudo em um único
serviço.

## Estrutura do projeto

```
wm-backend/
├── public/              ← site, página de produto e painel (HTML/JS)
│   ├── index.html
│   ├── product.html
│   ├── painel.html
│   ├── api.js
│   └── products.js
├── src/                 ← código da API
├── sql/schema.sql
├── scripts/
├── server.js
└── package.json
```

Sim — **o front-end fica dentro da pasta do backend** (em `public/`). É a
forma recomendada: um único serviço no Render serve tanto a API quanto o
site/painel, no mesmo domínio, sem precisar configurar CORS entre eles.

## Stack

- **Node.js + Express** — framework HTTP e também servidor dos arquivos estáticos
- **PostgreSQL** — banco de dados (Render Postgres ou Supabase)
- **Cloudinary** — armazenamento das imagens dos produtos e do banner
- **JWT em cookie httpOnly** — autenticação do painel admin
- **bcryptjs** — hash de senhas
- **helmet, express-rate-limit, express-validator, cors** — camadas de segurança

## Rodando localmente

```bash
npm install
cp .env.example .env        # depois edite o .env com seus valores reais
npm run migrate             # cria as tabelas no banco
npm run seed:admin          # cria o usuário administrador (lê ADMIN_EMAIL/ADMIN_PASSWORD do .env)
npm run dev                 # inicia com reinício automático (nodemon)
```

Acesse `http://localhost:4000` (site), `http://localhost:4000/painel.html`
(painel) e `http://localhost:4000/health` (healthcheck da API).

## Publicando no GitHub e depois no Render

1. **GitHub**: crie um repositório e suba esta pasta inteira (`wm-backend/`,
   incluindo `public/`). O `.gitignore` já impede que `.env` e `node_modules`
   sejam enviados — nunca comite o `.env` de verdade.
   ```bash
   git init
   git add .
   git commit -m "Backend + painel + site da WM Móveis"
   git remote add origin <url-do-seu-repositorio>
   git push -u origin main
   ```
2. **Banco de dados**: no Render, New → PostgreSQL. Copie a "Internal Database URL".
3. **Web Service**: New → Web Service → conecte o repositório do GitHub.
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/health`
4. Em **Environment**, configure (veja `.env.example` para a lista completa):
   `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET` (gere um valor forte —
   veja abaixo), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CLOUDINARY_CLOUD_NAME`,
   `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `COOKIE_SECURE=true`.
   Como o site/painel agora são servidos pelo mesmo serviço, `ALLOWED_ORIGINS`
   pode até ficar em branco (mesma origem não precisa de CORS) — mas deixe
   preenchido com a própria URL do Render como segurança extra.
5. Gerar um `JWT_SECRET` forte:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
6. Depois do primeiro deploy, abra o **Shell** do serviço no Render e rode:
   ```bash
   npm run migrate
   npm run seed:admin
   ```
7. Acesse `https://seu-servico.onrender.com` (site) e
   `https://seu-servico.onrender.com/painel.html` (painel). No painel, vá em
   **Configurações → Conexão com o Backend** e clique em
   **"Usar este mesmo domínio"** — pronto, painel e site conectados à API.
8. (Opcional) `render.yaml` (Dashboard → New → Blueprint) automatiza os
   passos 2–4.

⚠️ **O plano gratuito do Render "dorme" o serviço após um tempo sem uso** — a
primeira requisição depois disso demora alguns segundos para acordar. Normal,
não é falha de segurança.

## Como os dados do painel são armazenados

- **Produtos** e **banner principal**: tabelas próprias e estruturadas
  (`products`, `hero_banner`), com validação de cada campo — porque são vistos
  publicamente pelo site.
- **Restante do painel** (vendas, clientes, devoluções, orçamentos, estoque,
  caixa, fiado, pró-labore, MEI, metas, config de frete/fidelidade, dados da
  empresa): guardado em uma tabela genérica `app_data` (uma linha por seção,
  valor em JSON), através das rotas `/api/admin/data/:chave`. Isso foi uma
  escolha deliberada: são +15 seções diferentes, todas privadas (só você
  vê), e o painel já as tratava como blocos de dados no `localStorage`. Uma
  tabela relacional dedicada para cada uma exigiria muito mais tempo de
  desenvolvimento sem ganho real de segurança — a proteção (login, CSRF,
  validação de chave permitida, HTTPS) é a mesma em ambos os casos. O painel
  sincroniza automaticamente: tudo que é salvo localmente também é enviado ao
  servidor em segundo plano, e ao fazer login os dados mais recentes do
  servidor são baixados para o cache local.
- Se no futuro você quiser relatórios feitos direto no banco (em vez de
  calculados no navegador a partir desses dados), aí sim vale migrar
  `wm_sales`/`wm_stock_movements` etc. para tabelas próprias — posso te ajudar
  quando chegar a hora.

## Endpoints

### Públicos (usados pelo site)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | healthcheck |
| GET | `/api/products` | lista produtos visíveis na loja |
| GET | `/api/products/:id` | detalhe de um produto |
| GET | `/api/products/:id/related` | produtos relacionados (mesma categoria) |
| GET | `/api/hero-banner` | banner principal do site |

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` → define cookies de sessão e CSRF |
| POST | `/api/auth/logout` | encerra a sessão |
| GET | `/api/auth/me` | valida sessão atual e retorna o token CSRF |

### Administrativos (exigem login + token CSRF)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/admin/products` | lista completa (com custo/estoque) |
| POST | `/api/admin/products` | cria produto |
| PUT | `/api/admin/products/:id` | atualiza produto |
| DELETE | `/api/admin/products/:id` | remove produto |
| PUT | `/api/admin/hero-banner` | atualiza banner principal |
| POST | `/api/admin/upload` | envia até 6 imagens (`multipart/form-data`, campo `images`) e retorna as URLs do Cloudinary |
| GET | `/api/admin/data` | retorna todas as seções do painel de uma vez (vendas, clientes, etc.) |
| GET | `/api/admin/data/:chave` | retorna uma seção específica |
| PUT | `/api/admin/data/:chave` | substitui o conteúdo de uma seção (corpo = o próprio valor) |

Chaves aceitas em `/api/admin/data/:chave`: `wm_customers`, `wm_sales`,
`wm_returns`, `wm_quotes`, `wm_stock_movements`, `wm_caixa`, `wm_fiado`,
`wm_prolabore`, `wm_prolabore_goal`, `wm_mei_config`, `wm_mei_das`,
`wm_goals`, `wm_loyalty_config`, `wm_melhor_envio_config`,
`wm_shipping_rules`, `wm_company`, `wm_service_banner`.



### Como o painel deve chamar a API (resumo)

```js
// 1) Login
const r = await fetch(`${API_URL}/api/auth/login`, {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { csrfToken } = await r.json();  // guarde em memória (não em localStorage)

// 2) Requisições que alteram dados sempre precisam do header X-CSRF-Token
await fetch(`${API_URL}/api/admin/products`, {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
  body: JSON.stringify(produto)
});
```

`credentials: 'include'` é obrigatório em todas as chamadas — é o que envia os
cookies de sessão/CSRF junto com a requisição.

## Camadas de segurança implementadas

- **Senhas**: nunca armazenadas em texto puro — hash bcrypt com custo 12.
- **Sessão**: JWT em cookie `httpOnly` + `Secure` + `SameSite=Strict` (o token
  nunca fica acessível via JavaScript, o que neutraliza roubo de sessão por XSS).
- **CSRF**: padrão double-submit cookie — toda requisição de escrita exige um
  header `X-CSRF-Token` que precisa bater com o cookie correspondente.
- **Força bruta de login**: duas camadas — `express-rate-limit` (8 tentativas/15min
  por IP) e bloqueio a nível de banco (6 falhas do mesmo e-mail+IP/15min).
- **Enumeração de contas**: login sempre responde com a mesma mensagem genérica
  ("E-mail ou senha inválidos"), sem indicar se o e-mail existe.
- **SQL Injection**: 100% das queries usam parâmetros (`$1, $2...`) via `pg` —
  nunca há concatenação de string SQL. IDs são validados como UUID antes de
  chegar ao banco.
- **Validação de entrada**: `express-validator` em toda rota que recebe dados
  (tipo, tamanho, formato — inclusive nomes de categoria e cor em whitelist).
- **Upload de arquivos**: dupla verificação — mimetype declarado + inspeção real
  dos bytes do arquivo (magic number, via `file-type`) para impedir upload de
  script disfarçado de imagem. Limite de 5MB/arquivo e 6 arquivos por vez.
  Metadados EXIF são removidos das imagens no Cloudinary.
- **CORS restrito**: só os domínios listados em `ALLOWED_ORIGINS` podem chamar
  a API com cookies.
- **Cabeçalhos HTTP de segurança**: `helmet` (HSTS, X-Content-Type-Options,
  X-Frame-Options, remoção do header `X-Powered-By`, etc.).
- **HTTPS obrigatório** em produção (redireciona automaticamente).
- **Rate limiting geral** na API inteira, além do limite específico de login e
  de upload (evita abuso de cota do Cloudinary).
- **Tratamento de erros**: mensagens genéricas para o cliente em produção —
  detalhes técnicos e stack traces só vão para o log do servidor, nunca para
  a resposta HTTP.
- **Trilha de auditoria**: toda criação/edição/exclusão de produto é registrada
  em `audit_log` (quem, quando, o quê).
- **Variáveis de ambiente**: segredos nunca ficam no código — o servidor se
  recusa a iniciar se faltar alguma variável obrigatória ou se o `JWT_SECRET`
  for fraco.

## Boas práticas para manter a segurança ao longo do tempo

- Rode `npm audit` periodicamente e atualize dependências com vulnerabilidades.
- Nunca commite o arquivo `.env` (já está no `.gitignore`).
- Troque a senha do admin regularmente (`npm run seed:admin`).
- Revise a tabela `audit_log` de vez em quando para notar atividade suspeita.
- Se o painel for usado por mais de uma pessoa, crie um admin por pessoa
  (a tabela já suporta múltiplos administradores) em vez de compartilhar login.
