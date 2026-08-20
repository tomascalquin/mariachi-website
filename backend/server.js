// server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { apiLimiter } = require('./middleware/rateLimiters');
const authRoutes = require('./routes/auth');
const reservasRoutes = require('./routes/reservas');
const testimoniosRoutes = require('./routes/testimonios');
const galeriaRoutes = require('./routes/galeria');
const paquetesRoutes = require('./routes/paquetes');
const contactoRoutes = require('./routes/contacto');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('✗ Falta JWT_SECRET en las variables de entorno. Revisa el archivo .env');
  process.exit(1);
}

// Cabeceras HTTP de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'", 'https://cdn.tailwindcss.com', "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'", 'https://cdn.tailwindcss.com'],
    },
  },
}));

// CORS
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Límite general de peticiones a la API
app.use('/api', apiLimiter);

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/testimonios', testimoniosRoutes);
app.use('/api/galeria', galeriaRoutes);
app.use('/api/paquetes', paquetesRoutes);
app.use('/api/contacto', contactoRoutes);
app.use('/api/privacidad', privacidadRoutes);

// Panel de administración (estático)
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Sitio público (estático) — va al final para no tapar las rutas anteriores
app.use('/', express.static(path.join(__dirname, '../frontend')));

// Manejo de errores centralizado
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'Ocurrió un error. Intenta nuevamente.' });
});

// Exportar para Vercel (serverless) Y escuchar en local
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✔ Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
