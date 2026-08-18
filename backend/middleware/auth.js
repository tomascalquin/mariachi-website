// middleware/auth.js
const jwt = require('jsonwebtoken');

// Exige un token válido guardado en cookie httpOnly para acceder a rutas de admin.
function requireAdmin(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

// Capa extra contra CSRF: exige un header personalizado que un <form>
// enviado desde otro sitio no puede agregar (solo JavaScript del mismo
// panel, que es quien conoce este header, puede incluirlo).
function requireAjaxHeader(req, res, next) {
  if (req.get('X-Requested-With') !== 'mariachi-admin') {
    return res.status(403).json({ error: 'Solicitud rechazada' });
  }
  next();
}

module.exports = { requireAdmin, requireAjaxHeader };
