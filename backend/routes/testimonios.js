// routes/testimonios.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db/connection');
const { requireAdmin, requireAjaxHeader } = require('../middleware/auth');
const { formLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// Testimonios aprobados, para mostrar en el sitio (público)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.execute(`
      SELECT id, nombre, comuna, comentario, calificacion, creado_en
      FROM testimonios WHERE aprobado = 1
      ORDER BY creado_en DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener testimonios' });
  }
});

// Enviar un testimonio nuevo (público) — queda pendiente de aprobación
router.post('/',
  formLimiter,
  body('nombre').trim().isLength({ min: 2, max: 100 }).escape(),
  body('comuna').optional({ checkFalsy: true }).trim().isLength({ max: 60 }).escape(),
  body('comentario').trim().isLength({ min: 5, max: 500 }).escape(),
  body('calificacion').isInt({ min: 1, max: 5 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Revisa los datos ingresados' });

    try {
      const { nombre, comuna, comentario, calificacion } = req.body;
      await db.execute({
        sql: 'INSERT INTO testimonios (nombre, comuna, comentario, calificacion, aprobado) VALUES (?, ?, ?, ?, 0)',
        args: [nombre, comuna || null, comentario, calificacion],
      });
      res.status(201).json({ ok: true, mensaje: 'Gracias por tu comentario. Se publicará luego de revisarlo.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al guardar el testimonio' });
    }
  }
);

// Todos los testimonios, incluidos pendientes (admin)
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.execute('SELECT * FROM testimonios ORDER BY creado_en DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener testimonios' });
  }
});

// Aprobar o quitar un testimonio de publicación (admin)
router.patch('/:id/aprobar',
  requireAdmin, requireAjaxHeader,
  param('id').isInt(),
  body('aprobado').isBoolean(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Datos inválidos' });

    try {
      const result = await db.execute({
        sql: 'UPDATE testimonios SET aprobado = ? WHERE id = ?',
        args: [req.body.aprobado ? 1 : 0, req.params.id],
      });
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'No encontrado' });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar testimonio' });
    }
  }
);

// Eliminar un testimonio (admin)
router.delete('/:id', requireAdmin, requireAjaxHeader, param('id').isInt(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'ID inválido' });

  try {
    const result = await db.execute({ sql: 'DELETE FROM testimonios WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar testimonio' });
  }
});

module.exports = router;
