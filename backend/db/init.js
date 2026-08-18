// db/init.js
// Inicializa la base de datos Turso: crea tablas y seed inicial.
// Ejecutar UNA VEZ con las credenciales de Turso en .env:
//   node db/init.js
//
// Para el usuario admin, establece las vars antes de correr:
//   PowerShell: $env:ADMIN_USER="admin"; $env:ADMIN_PASSWORD="TuClave123!"; node db/init.js

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./db/mariachi.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

async function init() {
  console.log('Inicializando base de datos...');

  // Crear tablas
  await db.batch([
    `CREATE TABLE IF NOT EXISTS paquetes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      duracion_minutos INTEGER,
      precio_clp INTEGER,
      activo INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_cliente TEXT NOT NULL,
      telefono TEXT NOT NULL,
      email TEXT,
      comuna TEXT,
      tipo_evento TEXT NOT NULL,
      fecha_evento TEXT NOT NULL,
      hora_evento TEXT,
      paquete_id INTEGER REFERENCES paquetes(id),
      mensaje TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmada','cancelada','realizada')),
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS testimonios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      comuna TEXT,
      comentario TEXT NOT NULL,
      calificacion INTEGER NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
      aprobado INTEGER NOT NULL DEFAULT 0,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS galeria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      archivo TEXT NOT NULL,
      descripcion TEXT,
      tipo_evento TEXT,
      orden INTEGER NOT NULL DEFAULT 0,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS mensajes_contacto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT,
      telefono TEXT,
      mensaje TEXT NOT NULL,
      leido INTEGER NOT NULL DEFAULT 0,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS usuarios_admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas(fecha_evento)`,
    `CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado)`,
    `CREATE INDEX IF NOT EXISTS idx_testimonios_aprobado ON testimonios(aprobado)`,
  ], 'write');

  console.log('✔ Tablas e índices creados');

  // Seed paquetes de ejemplo
  const { rows } = await db.execute('SELECT COUNT(*) AS n FROM paquetes');
  if (Number(rows[0].n) === 0) {
    await db.batch([
      { sql: `INSERT INTO paquetes (nombre, descripcion, duracion_minutos, precio_clp) VALUES (?, ?, ?, ?)`, args: ['Serenata', 'Ideal para cumpleaños o sorpresas. 4-5 canciones.', 30, 60000] },
      { sql: `INSERT INTO paquetes (nombre, descripcion, duracion_minutos, precio_clp) VALUES (?, ?, ?, ?)`, args: ['Matrimonio', 'Ceremonia + recepción. Repertorio a elección.', 120, 350000] },
      { sql: `INSERT INTO paquetes (nombre, descripcion, duracion_minutos, precio_clp) VALUES (?, ?, ?, ?)`, args: ['Evento completo', 'Show de 2 horas para fiestas y eventos corporativos.', 120, 280000] },
    ], 'write');
    console.log('✔ Paquetes de ejemplo creados');
  }

  // Seed usuario admin
  const { rows: adminRows } = await db.execute('SELECT COUNT(*) AS n FROM usuarios_admin');
  if (Number(adminRows[0].n) === 0) {
    const usuario = process.env.ADMIN_USER || 'admin';
    const passwordPlano = process.env.ADMIN_PASSWORD || null;

    if (!passwordPlano) {
      console.log('⚠ No se creó usuario admin: define ADMIN_USER y ADMIN_PASSWORD como variables de entorno.');
    } else {
      const hash = bcrypt.hashSync(passwordPlano, 12);
      await db.execute({ sql: 'INSERT INTO usuarios_admin (usuario, password_hash) VALUES (?, ?)', args: [usuario, hash] });
      console.log(`✔ Usuario admin "${usuario}" creado`);
    }
  } else {
    console.log('ℹ Usuario admin ya existe, sin cambios.');
  }

  console.log('✔ Base de datos lista');
  await db.close();
}

init().catch(err => {
  console.error('✗ Error al inicializar:', err.message);
  process.exit(1);
});
