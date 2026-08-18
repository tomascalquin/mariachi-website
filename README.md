# Sitio web — Mariachi Luna Dorada

Sitio completo con reservas online y panel de administración, hecho para un grupo de mariachi en la Región de O'Higgins. Incluye sitio público, base de datos, API con buenas prácticas de seguridad, y un panel para gestionar todo sin tocar código.

## Estructura del proyecto

```
mariachi-website/
├── backend/          → servidor, API y base de datos
│   ├── server.js
│   ├── db/           → esquema e inicialización de SQLite
│   ├── routes/        → endpoints de la API
│   ├── middleware/    → autenticación, seguridad
│   ├── scripts/       → respaldo y cambio de contraseña
│   └── uploads/       → fotos subidas desde el panel
├── frontend/         → sitio público
│   ├── index.html
│   ├── css/style.css
│   └── js/config.js   ← EDITA ESTE ARCHIVO con tus datos reales
└── admin/            → panel de administración
    ├── login.html
    └── dashboard.html
```

## 1. Cómo correr el sitio en tu computador

Necesitas tener [Node.js](https://nodejs.org) instalado (versión 18 o superior).

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env` y reemplaza los valores de ejemplo. Para generar un `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copia ese valor dentro de `.env`, en `JWT_SECRET=`.

Inicializa la base de datos (crea las tablas y tu usuario administrador):

```bash
ADMIN_USER=tu_usuario ADMIN_PASSWORD="unaClaveSegura123!" npm run init-db
```

Levanta el servidor:

```bash
npm start
```

Abre `http://localhost:3000` para ver el sitio, y `http://localhost:3000/admin/login.html` para entrar al panel.

## 2. Personalizar con los datos reales

Edita **un solo archivo**: `frontend/js/config.js`. Ahí defines:

- Nombre del grupo
- Número de WhatsApp
- Correo, Instagram, Facebook, TikTok
- Comunas donde ofrecen el servicio

Los paquetes, precios, fotos de la galería y testimonios se gestionan directamente desde el panel de administración — no hace falta editar código para eso.

### Cambiar la contraseña del panel

```bash
npm run reset-admin-password -- tu_usuario "TuNuevaClaveSegura!"
```

## 3. Seguridad implementada

| Medida | Detalle |
|---|---|
| Contraseñas | Nunca en texto plano — hash bcrypt con 12 rondas |
| Sesión admin | Cookie `httpOnly`, `sameSite=strict`, y `secure` en producción |
| CSRF | Header personalizado obligatorio en toda acción que modifica datos |
| Inyección SQL | Consultas parametrizadas en toda la base de datos |
| XSS | Sanitización y escape de todo input de usuario |
| Fuerza bruta | Límite de 5 intentos de login cada 15 minutos |
| Spam | Límite de peticiones en formularios públicos |
| Subida de archivos | Solo JPG/PNG/WEBP, máximo 5MB, nombres aleatorios |
| Cabeceras HTTP | Helmet (CSP, sin `X-Powered-By`, etc.) |
| Secretos | Variables de entorno, nunca en el código |
| Errores | Nunca se exponen detalles internos al usuario |

### Respaldos automáticos

```bash
npm run backup
```

Esto crea una copia con fecha en `backend/backups/` y borra las de más de 14 días. Para que corra solo, agrégalo al **cron** del servidor (una vez que esté en producción):

```
0 3 * * * cd /ruta/al/proyecto/backend && npm run backup >> backups/backup.log 2>&1
```

### Mantenimiento recomendado

- Corre `npm audit` cada cierto tiempo para revisar vulnerabilidades nuevas.
- Revisa `npm outdated` y actualiza dependencias cada 2-3 meses.
- Cambia la contraseña del panel si alguna vez sospechas que fue compartida de más.

## 4. Dominio y hosting

### Comprar el dominio

Para un negocio chileno, lo más recomendable es un dominio **.cl**, administrado por NIC Chile (Universidad de Chile):

1. Entra a **nic.cl** y busca disponibilidad del nombre que quieras (ej: `mariachilunadorada.cl`).
2. El registro cuesta aproximadamente **$10.000 CLP + IVA al año** (verifica el valor vigente en el sitio).
3. Regístralo a nombre de tu mamá o de la razón social del negocio — nunca a nombre de un tercero o agencia, para que la propiedad del dominio quede clara.
4. Si el presupuesto alcanza, registra también la versión `.com` y redirígela al `.cl`, para proteger la marca.

También puedes comprarlo a través de un hosting chileno (HostingPlus, EcoHosting, etc.), que a veces lo incluye gratis con un plan — pero el registro pasa igual por NIC Chile.

### Elegir el hosting

Este proyecto necesita un hosting que ejecute **Node.js de forma persistente** (no hosting compartido tradicional tipo cPanel, que normalmente es solo para PHP) y que permita **almacenamiento persistente** para la base de datos SQLite y las fotos subidas.

**Opción recomendada para empezar — Railway:**
- Conectas tu código (por GitHub) y Railway lo despliega automáticamente.
- Soporta volúmenes persistentes para la base de datos y las fotos.
- Costo aproximado desde ~US$5/mes en uso liviano (facturación por uso; revisa `railway.com/pricing` para el valor actual).

**Pasos generales:**
1. Sube el proyecto a un repositorio de GitHub (puede ser privado). El `.gitignore` ya evita subir `.env`, `node_modules` y la base de datos.
2. Crea una cuenta en Railway y conecta el repositorio.
3. En la configuración del servicio, agrega volúmenes persistentes montados en `backend/db` y `backend/uploads` (así los datos no se pierden en cada actualización).
4. Define las variables de entorno: `NODE_ENV=production`, `JWT_SECRET` (genera uno nuevo, distinto al de desarrollo), `SITE_URL` (tu dominio final).
5. Como comando de inicio, usa: `node db/init.js && node server.js` — así la base de datos se crea sola la primera vez, y las veces siguientes no hace nada porque las tablas ya existen.
6. Una vez desplegado, Railway te da una URL de prueba (`algo.up.railway.app`). Verifica que todo funcione ahí antes de conectar el dominio.
7. En la configuración de dominio de Railway, agrega tu dominio `.cl` y sigue las instrucciones para apuntar los DNS desde NIC Chile (normalmente un registro CNAME o A). El certificado HTTPS se genera automáticamente.

**Alternativa con más control — un VPS (servidor propio):**

Si prefieres un costo fijo y más control (por ejemplo, un VPS de Hetzner, DigitalOcean o un proveedor chileno, desde ~US$4-6/mes), el resumen de pasos es:
1. Crear el servidor con Ubuntu.
2. Instalar Node.js, y un gestor de procesos como **PM2** para mantener el servidor corriendo siempre.
3. Instalar **Nginx** como proxy hacia el puerto de la app, y **Certbot** para HTTPS gratis (Let's Encrypt).
4. Apuntar el dominio (registro A) a la IP del servidor.
5. Copiar el proyecto al servidor, correr `npm install`, `npm run init-db`, y arrancarlo con `pm2 start server.js`.

Esta opción requiere más manejo técnico de servidor — si no te sientes cómoda/o con la línea de comandos, Railway es el camino más simple para partir.

### Después de publicar

- Prueba el formulario de reservas y de testimonios en el sitio ya en línea.
- Entra al panel admin en `tudominio.cl/admin/login.html` y confirma que puedes iniciar sesión.
- Configura el respaldo automático (cron) en el hosting elegido.
- Agrega el sitio a Google Business Profile con la zona de cobertura de la Región de O'Higgins, para aparecer en búsquedas locales.

---

¿Dudas sobre algún paso puntual del despliegue? Cuéntame en qué hosting te decidiste y seguimos afinando los detalles juntos.
