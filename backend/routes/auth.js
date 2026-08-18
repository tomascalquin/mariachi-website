// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db/connection');
const { loginLimiter } = require('../middleware/rateLimiters');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/login',
  loginLimiter,
  body('usuario').trim().notEmpty(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Datos inválidos' });

    try {
      const { usuario, password } = req.body;
      const { rows } = await db.execute({
        sql: 'SELECT * FROM usuarios_admin WHERE usuario = ?',
        args: [usuario],
      });
      const admin = rows[0] || null;

      // Mismo mensaje si el usuario no existe o si la clave está mal
      if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      const token = jwt.sign(
        { id: Number(admin.id), usuario: admin.usuario },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.cookie('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000,
      });

      res.json({ ok: true, usuario: admin.usuario });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  }
);

router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ usuario: req.admin.usuario });
});

module.exports = router;
