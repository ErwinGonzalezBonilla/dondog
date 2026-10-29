# Don Dog · Tienda online

Ecommerce completo del pet shop **Don Dog** (Candelaria Goyenechea 3820, local 165, Lo Castillo, Vitacura).

## Qué incluye

**Para clientes**
- Portada, catálogo con buscador y filtros, ficha de producto con URL propia (`/producto/nombre`).
- Carrito con stock en vivo (no deja comprar más de lo que hay).
- Checkout con despacho o retiro en tienda, RUT opcional y aceptación de términos.
- Pagos: **Webpay Plus** (Transbank), **Mercado Pago Checkout Pro** y **transferencia bancaria**.
- Página de estado del pedido y **seguimiento** con número de pedido + correo.
- Formulario de **contacto**, páginas de **términos**, **privacidad** y **cambios y devoluciones** (Ley 19.496).
- Asesor con IA “El Don” (opcional).

**Para el dueño (`/admin`)**
- Login con correo y contraseña.
- Pedidos con cuenta regresiva de 24 h, confirmar transferencias, cambiar estado (el cliente recibe un correo), cancelar (devuelve stock), descargar Excel (CSV).
- Productos con fotos, stock, ajustes de despacho (costo, gratis desde, comunas), correo de prueba y estado de las integraciones.

**Correos automáticos**

| Correo | Para |
|---|---|
| Pedido confirmado (pago aprobado) | Cliente |
| Pedido reservado + datos de transferencia | Cliente |
| Pedido listo / en camino / retirado / entregado / cancelado | Cliente |
| Reserva vencida por falta de transferencia | Cliente |
| Copia de su mensaje de contacto | Cliente |
| Nuevo pedido | Dueño |
| Stock bajo | Dueño |
| Mensaje desde el formulario de contacto | Dueño |

**Seguridad y SEO**: reserva de stock en transacción (dos clientes no pueden comprar la última unidad), pagos verificados contra Transbank/Mercado Pago en el servidor, contraseñas con scrypt, cabeceras de seguridad, `sitemap.xml`, `robots.txt` y datos estructurados de tienda y productos para Google.

## Estructura

```
api/index.js             Entrada para Vercel
server/server.js         Servidor Express: API, pagos, panel, SEO
server/db.js             Base de datos (archivo SQLite local o Turso en la nube)
server/orders.js         Pedidos, stock, vencimientos
server/payments.js       Webpay Plus y Mercado Pago
server/mail.js           Correos y sus plantillas
server/ai.js             Asesor IA (opcional)
server/index.html        Página (el servidor le agrega título y datos SEO)
server/scripts/          crear-admin, cargar-ejemplo, probar-correo
public/                  CSS, JS, imágenes
docs/                    Script de Google Sheets
test/                    Pruebas automáticas (npm test)
```

---

## Probarla en tu computador

Requiere **Node.js 22** o superior.

```bash
npm install
cp .env.example .env          # en Windows: copy .env.example .env
npm run cargar-ejemplo        # productos de ejemplo
npm run crear-admin -- tu@correo.cl
npm run dev
```

Abre http://localhost:3000 y el panel en http://localhost:3000/admin.
Sin SMTP configurado, los correos se guardan como HTML en `server/data/outbox/`.
Webpay viene en **modo pruebas**: usa la tarjeta de prueba de Transbank `4051 8856 0044 6623`, CVV `123`, cualquier fecha futura; RUT `11.111.111-1`, clave `123`.

---

## Publicar en Vercel con dominio provisional (xxx.vercel.app)

Vercel no guarda archivos entre visitas, por eso la tienda usa **Turso** (base de datos, gratis) y **Vercel Blob** (fotos).

### 1. Sube el código a GitHub
Tu repositorio `dondog` debe tener estos archivos (rama `main`).

### 2. Crea la base de datos en Turso
1. Entra a https://turso.tech y crea una cuenta (puedes usar GitHub).
2. **Create Database** → nombre `dondog` → región **São Paulo (gru)** o la más cercana.
3. En la base creada copia la **URL** (`libsql://dondog-tuusuario.turso.io`).
4. **Create Token** → copia el token (empieza con `eyJ...`).

### 3. Crea el proyecto en Vercel
1. Entra a https://vercel.com → **Add New… → Project** → importa el repositorio `dondog`.
2. Framework Preset: **Other**. No cambies nada más (la configuración está en `vercel.json`).
3. Antes de **Deploy**, abre **Environment Variables** y agrega:

| Variable | Valor |
|---|---|
| `SESSION_SECRET` | Un texto largo al azar (ver abajo) |
| `TURSO_DATABASE_URL` | La URL `libsql://…` de Turso |
| `TURSO_AUTH_TOKEN` | El token de Turso |
| `CRON_SECRET` | Otro texto largo al azar |
| `MAIL_OWNER_TO` | Tu correo, donde quieres recibir los pedidos |
| `TRANSFER_HOLDER`, `TRANSFER_RUT`, `TRANSFER_BANK`, `TRANSFER_ACCOUNT_TYPE`, `TRANSFER_ACCOUNT_NUMBER`, `TRANSFER_EMAIL` | Datos de tu cuenta bancaria |

   Para generar textos al azar: https://generate-secret.vercel.app/32 (recarga para obtener otro).

4. Pulsa **Deploy**. Al terminar tendrás una dirección tipo `https://dondog.vercel.app`.

### 4. Conecta el almacenamiento de fotos
1. En el proyecto: **Storage → Create → Blob** → nombre `dondog-fotos` → **Connect** al proyecto.
   Esto agrega solo la variable `BLOB_READ_WRITE_TOKEN`.
2. **Deployments → ⋯ → Redeploy** para que tome la variable.

### 5. Carga productos y crea tu usuario de administrador
Desde tu computador, en la carpeta del proyecto (con `npm install` hecho), usa las mismas credenciales de Turso:

**Mac / Linux**
```bash
export TURSO_DATABASE_URL="libsql://dondog-tuusuario.turso.io"
export TURSO_AUTH_TOKEN="eyJ..."
npm run crear-admin -- tu@correo.cl
npm run cargar-ejemplo
```

**Windows (PowerShell)**
```powershell
$env:TURSO_DATABASE_URL="libsql://dondog-tuusuario.turso.io"
$env:TURSO_AUTH_TOKEN="eyJ..."
npm run crear-admin -- tu@correo.cl
npm run cargar-ejemplo
```

`cargar-ejemplo` es opcional: si prefieres, crea los productos reales desde el panel.

### 6. Prueba
- Tienda: `https://TU-PROYECTO.vercel.app`
- Panel: `https://TU-PROYECTO.vercel.app/admin`
- Haz una compra con la tarjeta de prueba de Webpay (arriba) y con transferencia.
- En **Panel → Ajustes** revisa el estado de cada integración y usa **Enviarme un correo de prueba**.

### 7. Activa los correos (SMTP)
Mientras no configures SMTP, en Vercel los correos **no se envían** (quedan solo en el registro). Agrega en **Settings → Environment Variables** y luego **Redeploy**:

| Variable | Ejemplo |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `tucorreo@gmail.com` |
| `SMTP_PASS` | Contraseña de aplicación (no tu clave normal) |
| `MAIL_FROM` | `Don Dog <tucorreo@gmail.com>` |
| `MAIL_REPLY_TO` | `tucorreo@gmail.com` |

Con Gmail: activa la verificación en dos pasos y crea la contraseña en https://myaccount.google.com/apppasswords.
Mientras uses el dominio provisional, Gmail sirve. Cuando tengas `dondog.cl`, cambia a correos del dominio (ver más abajo).

---

## Pasar a producción

### Dominio propio
1. Compra `dondog.cl` en https://nic.cl (o el dominio que prefieras).
2. Vercel → proyecto → **Settings → Domains** → agrega `dondog.cl` y `www.dondog.cl`.
3. Vercel te muestra los registros DNS; agrégalos donde administras el dominio (en NIC Chile: “Servidores de nombre” o usa los DNS de Vercel).
4. Agrega la variable `SITE_URL=https://www.dondog.cl` y **Redeploy**.
5. En Google Search Console agrega el dominio y envía `https://www.dondog.cl/sitemap.xml`.

### Correos con tu dominio (pedidos@dondog.cl, contacto@dondog.cl)
1. Contrata casillas en **Google Workspace** o **Zoho Mail** (Zoho tiene plan gratis para 5 usuarios).
2. Crea `contacto@dondog.cl` y `pedidos@dondog.cl` (o un alias).
3. En el DNS del dominio agrega los registros que te indique el proveedor:
   - **MX** (para recibir correo)
   - **SPF** (TXT): `v=spf1 include:_spf.google.com ~all` (Google) o `v=spf1 include:zoho.com ~all` (Zoho)
   - **DKIM** (TXT): lo genera el proveedor
   - **DMARC** (TXT en `_dmarc`): `v=DMARC1; p=none; rua=mailto:contacto@dondog.cl`
   Sin SPF y DKIM los correos de pedidos llegan a spam.
4. Cambia las variables: `SMTP_HOST` (`smtp.gmail.com` o `smtp.zoho.com`), `SMTP_USER=pedidos@dondog.cl`, `SMTP_PASS`, `MAIL_FROM=Don Dog <pedidos@dondog.cl>`, `MAIL_REPLY_TO=contacto@dondog.cl`, `MAIL_OWNER_TO=contacto@dondog.cl`.

### Webpay real
1. Afíliate a **Webpay Plus** en https://publico.transbank.cl (necesitas RUT de empresa o persona con inicio de actividades).
2. Transbank pide una validación con el sitio funcionando en modo pruebas (ya lo está).
3. Te entregan **código de comercio** y **API key secreta**. Configura `WEBPAY_ENV=production`, `WEBPAY_COMMERCE_CODE` y `WEBPAY_API_KEY`, y **Redeploy**.

### Mercado Pago (opcional)
1. https://www.mercadopago.cl/developers → **Tus integraciones** → crea una aplicación (Checkout Pro).
2. Copia el **Access Token de producción** (`APP_USR-…`) en `MP_ACCESS_TOKEN` y pon `MP_ENABLED=true`.
3. En **Webhooks** configura la URL `https://www.dondog.cl/api/pagos/mp/webhook`, evento **Pagos**, y copia la clave secreta en `MP_WEBHOOK_SECRET`.

### Google Sheets (opcional)
Sigue las instrucciones de `docs/google-sheets-apps-script.gs` y pon la URL en `SHEETS_WEBHOOK_URL`. Cada pedido pagado se agrega como filas en la hoja.

### Asesor IA (opcional)
Crea una clave en https://console.anthropic.com y ponla en `ANTHROPIC_API_KEY`. Se activan el asesor “El Don” para clientes y el autocompletado de fichas y el análisis de stock en el panel. Sin clave, esas funciones simplemente no aparecen.

---

## Otros hostings (servidor propio, Render, Railway, VPS, cPanel con Node)

La misma aplicación corre como servidor Node normal, guardando todo en `server/data/` (sin Turso ni Blob):

```bash
npm ci --omit=dev
cp .env.example .env    # completar
npm run crear-admin -- tu@correo.cl
npm start
```

También hay `Dockerfile` (monta un volumen en `/app/server/data`). Respalda esa carpeta: contiene la base de datos y las fotos.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor local con recarga automática |
| `npm start` | Servidor en producción |
| `npm test` | Pruebas automáticas (compra con Webpay simulado, stock, panel, SEO) |
| `npm run crear-admin -- correo` | Crea un administrador o cambia su contraseña |
| `npm run cargar-ejemplo` | Carga el catálogo de ejemplo |
| `npm run probar-correo -- correo` | Envía un ejemplo de cada correo |

## Antes de abrir al público
- [ ] Revisar textos de términos, privacidad y devoluciones (`public/js/app.js`, sección PÁGINAS LEGALES) con tu contador o abogado.
- [ ] Cargar productos reales con fotos, precios y stock.
- [ ] Datos bancarios de transferencia.
- [ ] SMTP funcionando (correo de prueba desde el panel).
- [ ] Webpay en producción.
- [ ] Teléfono y horario en `STORE_PHONE` y `STORE_HOURS`.
