// Script temporal para crear usuario admin
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASSWORD = 'Admin123!';

const path = require('path');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'db', 'mariachi.db');
const db = new DatabaseSync(DB_PATH);

const countAdmins = db.prepare('SELECT COUNT(*) AS n FROM usuarios_admin').get().n;
if (countAdmins === 0) {
  const hash = require('bcryptjs').hashSync('Admin123!', 12);
  db.prepare('INSERT INTO usuarios_admin (usuario, password_hash) VALUES (?, ?)').run('admin', hash);
  console.log('✔ Usuario admin creado. Usuario: admin, Clave: Admin123!');
} else {
  console.log('ℹ El usuario admin ya existe. No se creó uno nuevo.');
}
db.close();
