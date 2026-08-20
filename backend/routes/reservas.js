// routes/reservas.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db/connection');
const { requireAdmin, requireAjaxHeader } = require('../middleware/auth');
const { formLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// Crear una reserva (público, desde el formulario del sitio)
router.post('/',
  formLimiter,
  body('nombre_cliente').trim().isLength({ min: 2, max: 100 }).escape(),
  body('telefono').trim().isLength({ min: 6, max: 20 }).matches(/^[0-9+\s-]+$/),
  body('email').optional({ checkFalsy: true }).trim().isEmail().normalizeEmail(),
  body('comuna').optional({ checkFalsy: true }).trim().isLength({ max: 60 }).escape(),
  body('tipo_evento').trim().isLength({ min: 2, max: 60 }).escape(),
  body('fecha_evento').isISO8601().withMessage('Fecha inválida'),
  body('hora_evento').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape(),
  body('paquete_id').optional({ checkFalsy: true }).isInt(),
  body('mensaje').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).escape(),
  body('consentimiento').isBoolean().custom((val) => val === true || val === 'true'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Revisa los datos ingresados', detalles: errors.array() });
    }

    try {
      const { nombre_cliente, telefono, email, comuna, tipo_evento, fecha_evento, hora_evento, paquete_id, mensaje, consentimiento } = req.body;
      const result = await db.execute({
        sql: 'INSERT INTO reservas (nombre_cliente, telefono, email, comuna, tipo_evento, fecha_evento, hora_evento, paquete_id, mensaje, consentimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [nombre_cliente, telefono, email || null, comuna || null, tipo_evento, fecha_evento, hora_evento || null, paquete_id || null, mensaje || null, consentimiento === true || consentimiento === 'true' ? 1 : 0],
      });
      res.status(201).json({ ok: true, id: Number(result.lastInsertRowid), mensaje: '¡Gracias! Te contactaremos pronto para confirmar.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al guardar la reserva' });
    }
  }
);

// Listar todas las reservas (solo admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.execute(`
      SELECT r.*, p.nombre AS paquete_nombre
      FROM reservas r
      LEFT JOIN paquetes p ON p.id = r.paquete_id
      ORDER BY r.fecha_evento ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

// Cambiar el estado de una reserva (solo admin)
router.patch('/:id/estado',
  requireAdmin, requireAjaxHeader,
  param('id').isInt(),
  body('estado').isIn(['pendiente', 'confirmada', 'cancelada', 'realizada']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Datos inválidos' });

    try {
      const result = await db.execute({
        sql: 'UPDATE reservas SET estado = ? WHERE id = ?',
        args: [req.body.estado, req.params.id],
      });
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar estado' });
    }
  }
);

// Eliminar una reserva (solo admin)
router.delete('/:id', requireAdmin, requireAjaxHeader, param('id').isInt(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'ID inválido' });

  try {
    const result = await db.execute({ sql: 'DELETE FROM reservas WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar reserva' });
  }
});

module.exports = router;
