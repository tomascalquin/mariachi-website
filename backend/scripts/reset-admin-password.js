// scripts/reset-admin-password.js
//
// Cambia (o crea) la contraseña de un usuario del panel de administración.
//
// Uso:  node scripts/reset-admin-password.js <usuario> <nueva_clave>
// Ej:   node scripts/reset-admin-password.js admin "MiClaveNueva2026!"

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('../db/connection');

const [, , usuario, clave] = process.argv;

if (!usuario || !clave) {
  console.log('Uso: node scripts/reset-admin-password.js <usuario> <nueva_clave>');
  process.exit(1);
}
if (clave.length < 8) {
  console.log('✗ La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

async function main() {
  const hash = bcrypt.hashSync(clave, 12);
  const { rows } = await db.execute({ sql: 'SELECT id FROM usuarios_admin WHERE usuario = ?', args: [usuario] });

  if (rows.length > 0) {
    await db.execute({ sql: 'UPDATE usuarios_admin SET password_hash = ? WHERE usuario = ?', args: [hash, usuario] });
    console.log(`✔ Contraseña actualizada para "${usuario}"`);
  } else {
    await db.execute({ sql: 'INSERT INTO usuarios_admin (usuario, password_hash) VALUES (?, ?)', args: [usuario, hash] });
    console.log(`✔ Usuario "${usuario}" creado`);
  }
  await db.close();
}

main().catch(err => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
