// routes/contacto.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db/connection');
const { requireAdmin, requireAjaxHeader } = require('../middleware/auth');
const { formLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/',
  formLimiter,
  body('nombre').trim().isLength({ min: 2, max: 100 }).escape(),
  body('email').optional({ checkFalsy: true }).trim().isEmail().normalizeEmail(),
  body('telefono').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape(),
  body('mensaje').trim().isLength({ min: 5, max: 500 }).escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Revisa los datos ingresados' });

    try {
      const { nombre, email, telefono, mensaje } = req.body;
      await db.execute({
        sql: 'INSERT INTO mensajes_contacto (nombre, email, telefono, mensaje) VALUES (?, ?, ?, ?)',
        args: [nombre, email || null, telefono || null, mensaje],
      });
      res.status(201).json({ ok: true, mensaje: 'Mensaje enviado. Te responderemos a la brevedad.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al guardar el mensaje' });
    }
  }
);

router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.execute('SELECT * FROM mensajes_contacto ORDER BY creado_en DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

router.patch('/:id/leido',
  requireAdmin, requireAjaxHeader,
  param('id').isInt(),
  body('leido').isBoolean(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Datos inválidos' });

    try {
      const result = await db.execute({
        sql: 'UPDATE mensajes_contacto SET leido = ? WHERE id = ?',
        args: [req.body.leido ? 1 : 0, req.params.id],
      });
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'No encontrado' });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar mensaje' });
    }
  }
);

module.exports = router;
