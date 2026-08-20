require('dotenv').config();
const { createClient } = require('@libsql/client');
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./db/mariachi.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

async function migrate() {
    try {
        await db.batch([
            'ALTER TABLE reservas ADD COLUMN consentimiento INTEGER NOT NULL DEFAULT 0',
            'ALTER TABLE testimonios ADD COLUMN consentimiento INTEGER NOT NULL DEFAULT 0',
            `CREATE TABLE IF NOT EXISTS solicitudes_eliminacion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT,
                telefono TEXT,
                tipo TEXT NOT NULL,
                estado TEXT NOT NULL DEFAULT 'pendiente',
                creado_en TEXT NOT NULL DEFAULT (datetime('now'))
            )`
        ], 'write');
        console.log('Migración exitosa');
    } catch(e) {
        console.log('Error migrando: ' + e);
    }
}
migrate();
