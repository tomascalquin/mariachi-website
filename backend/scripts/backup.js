// scripts/backup.js
//
// Crea una copia de respaldo de la base de datos con fecha y hora,
// y elimina respaldos con más de 14 días de antigüedad.
//
// Uso manual:   node scripts/backup.js
// Uso programado (cron, todos los días a las 3 AM):
//   0 3 * * * cd /ruta/al/proyecto/backend && node scripts/backup.js >> backups/backup.log 2>&1

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../db/mariachi.db');
const BACKUP_DIR = path.join(__dirname, '../backups');
const DIAS_A_CONSERVAR = 14;

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const ahora = new Date();
const marca = ahora.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const destino = path.join(BACKUP_DIR, `mariachi-${marca}.db`);

// Usa la API de respaldo oficial de SQLite: es segura incluso con el
// servidor corriendo al mismo tiempo (no corrompe datos en uso).
const db = new Database(DB_PATH, { readonly: true });
db.backup(destino)
  .then(() => {
    console.log(`✔ Respaldo creado: ${destino}`);
    db.close();
    limpiarRespaldosAntiguos();
  })
  .catch((err) => {
    console.error('✗ Error al crear el respaldo:', err.message);
    db.close();
    process.exit(1);
  });

function limpiarRespaldosAntiguos() {
  const limite = Date.now() - DIAS_A_CONSERVAR * 24 * 60 * 60 * 1000;
  const archivos = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.db'));

  for (const archivo of archivos) {
    const ruta = path.join(BACKUP_DIR, archivo);
    if (fs.statSync(ruta).mtimeMs < limite) {
      fs.unlinkSync(ruta);
      console.log(`🗑 Respaldo antiguo eliminado: ${archivo}`);
    }
  }
}
