// routes/paquetes.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db/connection');
const { requireAdmin, requireAjaxHeader } = require('../middleware/auth');

const router = express.Router();

// Paquetes activos, para mostrar en el sitio (público)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.execute('SELECT * FROM paquetes WHERE activo = 1 ORDER BY precio_clp ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener paquetes' });
  }
});

// Todos los paquetes, incluidos inactivos (admin)
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.execute('SELECT * FROM paquetes ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener paquetes' });
  }
});

const validacionPaquete = [
  body('nombre').trim().isLength({ min: 2, max: 100 }).escape(),
  body('descripcion').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).escape(),
  body('duracion_minutos').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('precio_clp').isInt({ min: 0 }),
];

// Crear paquete (admin)
router.post('/', requireAdmin, requireAjaxHeader, validacionPaquete, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Datos inválidos' });

  try {
    const { nombre, descripcion, duracion_minutos, precio_clp } = req.body;
    const result = await db.execute({
      sql: 'INSERT INTO paquetes (nombre, descripcion, duracion_minutos, precio_clp) VALUES (?, ?, ?, ?)',
      args: [nombre, descripcion || null, duracion_minutos || null, precio_clp],
    });
    res.status(201).json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear paquete' });
  }
});

// Editar paquete (admin)
router.put('/:id', requireAdmin, requireAjaxHeader, param('id').isInt(), [...validacionPaquete, body('activo').isBoolean()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Datos inválidos' });

  try {
    const { nombre, descripcion, duracion_minutos, precio_clp, activo } = req.body;
    const result = await db.execute({
      sql: 'UPDATE paquetes SET nombre=?, descripcion=?, duracion_minutos=?, precio_clp=?, activo=? WHERE id=?',
      args: [nombre, descripcion || null, duracion_minutos || null, precio_clp, activo ? 1 : 0, req.params.id],
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar paquete' });
  }
});

// Eliminar paquete (admin)
router.delete('/:id', requireAdmin, requireAjaxHeader, param('id').isInt(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'ID inválido' });

  try {
    const result = await db.execute({ sql: 'DELETE FROM paquetes WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar paquete' });
  }
});

module.exports = router;
