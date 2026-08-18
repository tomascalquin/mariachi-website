// middleware/rateLimiters.js
const rateLimit = require('express-rate-limit');

// Límite general para toda la API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta más tarde.' },
});

// Límite estricto para el login del panel admin (frena ataques de fuerza bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de acceso. Intenta de nuevo en 15 minutos.' },
});

// Límite para formularios públicos (reservas, testimonios, contacto) — evita spam
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes desde tu conexión. Intenta más tarde o escríbenos por WhatsApp.' },
});

module.exports = { apiLimiter, loginLimiter, formLimiter };
