const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Muitas tentativas. Tente novamente em alguns minutos.',
    code: 'RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { success: false, error: 'Limite de requisições excedido.', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

const julioLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Limite de mensagens ao Julio excedido. Aguarde 1 minuto.',
    code: 'RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter, julioLimiter };
