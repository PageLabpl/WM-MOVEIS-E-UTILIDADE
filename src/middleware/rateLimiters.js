const rateLimit = require('express-rate-limit');

/** Limite geral para toda a API — mitiga scraping agressivo e DoS simples. */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
});

/** Limite estrito para login — principal defesa contra força bruta de senha. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.' }
});

/** Limite para upload de imagens — evita estourar a cota do Cloudinary por abuso. */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de uploads por hora atingido. Tente novamente mais tarde.' }
});

module.exports = { generalLimiter, loginLimiter, uploadLimiter };
