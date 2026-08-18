// db/connection.js
// Cliente Turso (libSQL) — funciona igual en local (file:) y en producción (libsql://)
// Para desarrollo local: TURSO_DATABASE_URL=file:./db/mariachi.db  (sin token)
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./db/mariachi.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

module.exports = db;
