const rateLimit = require("express-rate-limit");

// Limite geral da API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas requisicoes. Tente novamente em alguns minutos." },
});

// Limite mais rigoroso para login/cadastro (protege contra forca bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas de login. Tente novamente em alguns minutos." },
});

module.exports = { apiLimiter, authLimiter };
