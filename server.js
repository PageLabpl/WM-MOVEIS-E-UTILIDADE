require('dotenv').config();

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('❌ Variáveis de ambiente obrigatórias ausentes:', missing.join(', '));
  console.error('   Configure-as no arquivo .env (local) ou no painel do Render (produção).');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET muito curto/fraco. Use pelo menos 32 caracteres aleatórios.');
  process.exit(1);
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { generalLimiter } = require('./src/middleware/rateLimiters');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/auth.routes');
const productsRoutes = require('./src/routes/products.routes');
const bannerRoutes = require('./src/routes/banner.routes');
const uploadRoutes = require('./src/routes/upload.routes');
const dataRoutes = require('./src/routes/data.routes');

const app = express();

// O Render fica atrás de um proxy reverso; isso é necessário para que
// req.ip e os rate limiters funcionem com o IP real do visitante.
app.set('trust proxy', 1);

// Força HTTPS em produção (o Render já faz isso na borda, mas mantemos
// uma segunda camada caso o app seja acessado por outro caminho).
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

// Cabeçalhos de segurança HTTP (HSTS, X-Content-Type-Options, X-Frame-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // API pura em JSON; o CSP relevante fica no HTML do front-end
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS estrito: só os domínios explicitamente permitidos podem chamar a API com cookies.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origem não permitida pelo CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
}));

app.use(cookieParser());
app.use(express.json({ limit: '3mb' })); // limite de payload — mitiga ataques de negação de serviço por corpo gigante; dados do painel (vendas/clientes/etc.) podem crescer, por isso um pouco mais folgado que o mínimo
app.use(generalLimiter);

// Healthcheck público (usado pelo Render para saber se o serviço está de pé)
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.use('/api/auth', authRoutes);
app.use('/api', productsRoutes);
app.use('/api', bannerRoutes);
app.use('/api', uploadRoutes);
app.use('/api', dataRoutes);

// Serve o site, a página de produto e o painel como arquivos estáticos, do
// mesmo serviço/domínio da API. Isso elimina a necessidade de CORS entre
// front-end e back-end (mesma origem) e simplifica o deploy: um único
// serviço no Render serve tudo. Basta colocar os arquivos HTML/JS em /public.
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ WM Móveis API rodando na porta ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// Evita que o processo morra silenciosamente em erros não tratados —
// loga e encerra de forma controlada para o Render reiniciar o serviço.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
