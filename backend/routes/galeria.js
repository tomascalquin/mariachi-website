// routes/galeria.js
// Las imágenes se guardan en Cloudinary (no en disco local).
// El campo "archivo" en la BD almacena el public_id de Cloudinary.
// Las URLs se construyen con cloudinary.url() al momento de servir.
const express = require('express');
const { Readable } = require('stream');
const { param, validationResult } = require('express-validator');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const db = require('../db/connection');
const { requireAdmin, requireAjaxHeader } = require('../middleware/auth');

// Configuración de Cloudinary (usa variables de entorno)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = express.Router();
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Multer guarda el archivo en memoria (no en disco) para luego subirlo a Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
    }
    cb(null, true);
  },
});

function uploadMiddleware(req, res, next) {
  upload.single('imagen')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

// Sube un buffer a Cloudinary y retorna el resultado
function subirACloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'mariachi-galeria', resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

// Listar imágenes (público) — retorna URL segura de Cloudinary
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.execute('SELECT * FROM galeria ORDER BY orden ASC, creado_en DESC');
    // Construir URL pública de Cloudinary para cada imagen
    const imagenes = rows.map(img => ({
      ...img,
      url: cloudinary.url(img.archivo, { secure: true, fetch_format: 'auto', quality: 'auto' }),
    }));
    res.json(imagenes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener galería' });
  }
});

// Subir una imagen (admin)
router.post('/', requireAdmin, requireAjaxHeader, uploadMiddleware, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });

  try {
    const descripcion = (req.body.descripcion || '').slice(0, 200);
    const tipo_evento = (req.body.tipo_evento || '').slice(0, 60);

    // Subir a Cloudinary
    const resultado = await subirACloudinary(req.file.buffer);

    // Guardar el public_id en la base de datos
    const result = await db.execute({
      sql: 'INSERT INTO galeria (archivo, descripcion, tipo_evento) VALUES (?, ?, ?)',
      args: [resultado.public_id, descripcion, tipo_evento],
    });

    res.status(201).json({
      ok: true,
      id: Number(result.lastInsertRowid),
      archivo: resultado.public_id,
      url: resultado.secure_url,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
});

// Eliminar una imagen (admin)
router.delete('/:id', requireAdmin, requireAjaxHeader, param('id').isInt(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'ID inválido' });

  try {
    const { rows } = await db.execute({ sql: 'SELECT * FROM galeria WHERE id = ?', args: [req.params.id] });
    const img = rows[0] || null;
    if (!img) return res.status(404).json({ error: 'No encontrada' });

    // Eliminar de Cloudinary (no bloqueante — si falla, igual borramos de la BD)
    cloudinary.uploader.destroy(img.archivo).catch(err => console.error('Cloudinary delete error:', err));

    await db.execute({ sql: 'DELETE FROM galeria WHERE id = ?', args: [req.params.id] });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar imagen' });
  }
});

module.exports = router;
