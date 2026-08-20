const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/connection');
const { requireAdmin } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter estricto para evitar spam en este endpoint
const elimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Límite de 3 solicitudes por IP por hora
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enviar solicitud de eliminación de datos (Público)
router.post('/solicitud-eliminacion',
  elimLimiter,
  body('email').optional({ checkFalsy: true }).trim().isEmail().normalizeEmail(),
  body('telefono').optional({ checkFalsy: true }).trim().isLength({ min: 6, max: 20 }).matches(/^[0-9+\s-]+$/),
  body('tipo').isIn(['reserva', 'testimonio', 'todo']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Revisa los datos ingresados' });

    const { email, telefono, tipo } = req.body;

    if (!email && !telefono) {
      return res.status(400).json({ error: 'Debes proporcionar un email o teléfono para identificarte' });
    }

    try {
      await db.execute({
        sql: 'INSERT INTO solicitudes_eliminacion (email, telefono, tipo, estado) VALUES (?, ?, ?, ?)',
        args: [email || null, telefono || null, tipo, 'pendiente'],
      });
      res.status(201).json({ ok: true, mensaje: 'Solicitud recibida. Procesaremos la eliminación en un plazo máximo de 30 días hábiles.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
  }
);

// Listar solicitudes (Admin)
router.get('/admin/solicitudes', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.execute("SELECT * FROM solicitudes_eliminacion ORDER BY creado_en DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Marcar solicitud como completada (Admin)
router.patch('/admin/solicitudes/:id/estado', requireAdmin, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'UPDATE solicitudes_eliminacion SET estado = ? WHERE id = ?',
      args: [req.body.estado, req.params.id],
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar solicitud' });
  }
});

module.exports = router;
