// Servidor de la tienda Don Dog: API, pagos, panel del dueño y archivos públicos.
// Funciona como servidor Node normal (npm start) y como función de Vercel (api/index.js).
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const multer = require("multer");

const config = require("./config");
const { db, getSettings, setSettings, rowToOrder } = require("./db");
const auth = require("./auth");
const orders = require("./orders");
const products = require("./products");
const payments = require("./payments");
const mail = require("./mail");
const ai = require("./ai");

const app = express();
const PUBLIC = path.join(config.root, "public");
const INDEX = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const IMAGE_TYPES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

if (config.trustProxy) app.set("trust proxy", 1);
app.disable("x-powered-by");

// ---------- cabeceras de seguridad ----------
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  // La cámara se permite solo para este sitio (lector de códigos de barras en la venta en tienda).
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob: https:", "connect-src 'self'",
    "frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'",
  ].join("; "));
  if (config.production) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: false, limit: "50kb" }));

// ---------- vencimiento de reservas ----------
// Se revisa como máximo una vez por minuto al llegar visitas (sirve también en Vercel, donde no hay procesos permanentes).
let lastSweep = 0;
app.use((req, res, next) => {
  if (Date.now() - lastSweep > 60e3) {
    lastSweep = Date.now();
    orders.sweepExpired().catch(e => console.error("[vencimientos]", e.message));
  }
  next();
});

// ---------- límite simple de solicitudes por IP ----------
function rateLimit(max, windowMs) {
  const hits = new Map();
  let since = Date.now();
  return (req, res, next) => {
    if (Date.now() - since > windowMs) { hits.clear(); since = Date.now(); }
    const k = req.ip, n = (hits.get(k) || 0) + 1;
    hits.set(k, n);
    if (n > max) return res.status(429).json({ error: "Demasiadas solicitudes. Espera un momento e intenta de nuevo." });
    next();
  };
}

// ---------- API pública ----------
async function publicSettings() {
  const s = await getSettings();
  return { slaHours: s.slaHours, lowStock: s.lowStock, freeShip: s.freeShip, shipCost: s.shipCost, shipComunas: s.shipComunas };
}
function paymentOptions() {
  return {
    webpay: config.webpay.enabled,
    mercadopago: config.mercadopago.enabled && !!config.mercadopago.accessToken,
    transferencia: config.transfer.enabled,
    testMode: config.webpay.enabled && !config.webpay.production,
  };
}

app.get("/api/catalog", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    products: (await products.listProducts()).map(products.publicProduct),
    config: await publicSettings(), payments: paymentOptions(), ai: ai.enabled(),
    store: config.store,
  });
});

app.post("/api/orders", rateLimit(20, 10 * 60e3), async (req, res) => {
  const { items, customer, delivery, payment } = req.body || {};
  const order = await orders.createOrder({ items, customer, delivery, payment });
  let pay;
  try { pay = await payments.startPayment(order); }
  catch (e) {
    console.error("[pago] No se pudo iniciar", order.payment, e.message);
    await orders.markFailed(order.id, "rechazado", { error: "no se pudo iniciar el pago" });
    return res.status(502).json({ error: "No pudimos conectar con el medio de pago. Intenta de nuevo o elige otro." });
  }
  if (order.payment === "transferencia") {
    mail.sendLater("pedidoRecibidoTransferencia", order);
    mail.sendLater("avisoNuevoPedido", order);
  }
  res.json({ order: orders.publicOrder(order), key: order.accessKey, pay });
});

app.get("/api/orders/:id", async (req, res) => {
  const o = await orders.getOrder(req.params.id);
  const k = String(req.query.k || "");
  if (!o || k.length !== o.accessKey.length || !crypto.timingSafeEqual(Buffer.from(k), Buffer.from(o.accessKey))) return res.status(404).json({ error: "Pedido no encontrado." });
  res.setHeader("Cache-Control", "no-store");
  res.json({ order: orders.publicOrder(o) });
});

// Seguimiento: número de pedido + correo.
app.post("/api/orders/lookup", rateLimit(15, 10 * 60e3), async (req, res) => {
  const id = String(req.body?.id || "").trim().toUpperCase(), email = String(req.body?.email || "").trim().toLowerCase();
  const o = await orders.getOrder(id.startsWith("DD-") ? id : "DD-" + id);
  if (!o || o.customer.email !== email) return res.status(404).json({ error: "No encontramos un pedido con esos datos." });
  res.json({ order: orders.publicOrder(o), key: o.accessKey });
});

app.post("/api/contact", rateLimit(5, 30 * 60e3), async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // trampa anti-spam
  const f = {
    name: String(b.name || "").trim().slice(0, 100), email: String(b.email || "").trim().slice(0, 160),
    phone: String(b.phone || "").trim().slice(0, 40), message: String(b.message || "").trim().slice(0, 3000),
  };
  if (f.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email) || f.message.length < 5) return res.status(400).json({ error: "Completa nombre, correo y mensaje." });
  const r = await mail.send("contactoDueno", f);
  if (r.ok === false) return res.status(502).json({ error: "No pudimos enviar tu mensaje. Escríbenos por Instagram." });
  mail.sendLater("contactoCliente", f);
  res.json({ ok: true });
});

app.post("/api/ai/chat", rateLimit(30, 10 * 60e3), async (req, res) => {
  if (!ai.enabled()) return res.status(503).json({ error: "El asesor no está disponible." });
  const history = (Array.isArray(req.body?.history) ? req.body.history : []).filter(m => m && typeof m.text === "string").slice(-8);
  if (!history.length || history.at(-1).role !== "user") return res.status(400).json({ error: "Escribe tu consulta." });
  const catalog = (await products.listProducts()).filter(p => p.stock > 0)
    .map(p => ({ id: p.id, n: p.name, m: p.brand, c: p.category, pet: p.pet, precio: p.price, stock: p.stock, tags: p.tags }));
  try {
    const r = await ai.advisor({ history, catalog });
    const valid = new Set(catalog.map(p => p.id));
    res.json({ reply: String(r.reply || ""), ids: (r.ids || []).filter(id => valid.has(id)).slice(0, 4) });
  } catch (e) {
    console.error("[ia] asesor:", e.message);
    res.status(502).json({ error: "No pude responder ahora. Intenta de nuevo." });
  }
});

// ---------- retornos y avisos de pago ----------
async function backToStore(res, orderId, estado) {
  const o = orderId && await orders.getOrder(orderId);
  res.redirect(303, o ? `/?pedido=${encodeURIComponent(o.id)}&k=${encodeURIComponent(o.accessKey)}&pago=${estado}` : `/?pago=${estado}`);
}
app.all("/pago/webpay/retorno", async (req, res) => {
  const r = await payments.handleWebpayReturn({ ...req.query, ...(req.body || {}) });
  await backToStore(res, r.orderId, r.ok ? "ok" : "rechazado");
});
app.get("/pago/mp/retorno", async (req, res) => {
  const paymentId = req.query.payment_id || req.query.collection_id;
  const ref = String(req.query.external_reference || "");
  if (!paymentId || paymentId === "null") return backToStore(res, ref, "pendiente");
  try {
    const r = await payments.syncMercadoPagoPayment(paymentId);
    await backToStore(res, r.orderId || ref, r.ok ? "ok" : r.pending ? "pendiente" : "rechazado");
  } catch (e) {
    console.error("[mp] retorno:", e.message);
    await backToStore(res, ref, "pendiente");
  }
});
app.post("/api/pagos/mp/webhook", async (req, res) => {
  const type = req.body?.type || req.query.type || req.query.topic;
  const id = req.body?.data?.id || req.query["data.id"] || req.query.id;
  if (type !== "payment" || !id) return res.sendStatus(200);
  if (!payments.verifyMercadoPagoSignature(req, String(id))) return res.sendStatus(401);
  try { await payments.syncMercadoPagoPayment(id); } catch (e) { console.error("[mp] webhook:", e.message); return res.sendStatus(500); }
  res.sendStatus(200);
});

// Tarea diaria de Vercel Cron (respaldo del vencimiento por visitas).
app.get("/api/cron/vencimientos", async (req, res) => {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.sendStatus(401);
  res.json({ vencidos: await orders.sweepExpired() });
});

// ---------- panel del dueño ----------
const admin = express.Router();

admin.post("/login", rateLimit(30, 15 * 60e3), async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase(), pass = String(req.body?.password || "");
  if (!auth.loginAllowed(req.ip)) return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });
  const a = await db.get("SELECT * FROM admins WHERE email = ?", [email]);
  if (!a || !auth.verifyPassword(pass, a.pass_hash)) { auth.loginFailed(req.ip); return res.status(401).json({ error: "Correo o contraseña incorrectos." }); }
  auth.setSessionCookie(res, Number(a.id));
  res.json({ ok: true, admin: { email: a.email, name: a.name } });
});
admin.post("/logout", (req, res) => { auth.clearSessionCookie(res); res.json({ ok: true }); });
admin.get("/me", async (req, res) => {
  const a = await auth.currentAdmin(req);
  if (!a) return res.status(401).json({ error: "Sin sesión." });
  res.json({ admin: a, status: systemStatus() });
});

admin.use(auth.requireAdmin);

function systemStatus() {
  return {
    smtp: mail.smtpReady, ownerEmail: !!config.mail.ownerTo, webpay: config.webpay.enabled ? (config.webpay.production ? "produccion" : "integracion") : "apagado",
    mercadopago: config.mercadopago.enabled && !!config.mercadopago.accessToken, transfer: config.transfer.enabled && !!config.transfer.accountNumber,
    ai: ai.enabled(), sheets: !!config.sheetsWebhook, siteUrl: config.siteUrl,
  };
}

admin.get("/products", async (req, res) => res.json({ products: await products.listProducts({ includeInactive: true }) }));
admin.post("/products", async (req, res) => res.json({ product: await products.saveProduct(req.body || {}) }));
admin.put("/products/:id", async (req, res) => res.json({ product: await products.saveProduct(req.body || {}, req.params.id) }));
admin.put("/products/:id/stock", async (req, res) => res.json({ product: await products.setStock(req.params.id, req.body?.stock) }));
admin.delete("/products/:id", async (req, res) => { await products.deleteProduct(req.params.id); res.json({ ok: true }); });

// Fotos: en Vercel van a Vercel Blob (BLOB_READ_WRITE_TOKEN); en servidor propio, a la carpeta de datos.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, !!IMAGE_TYPES[file.mimetype]),
});
admin.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Sube una imagen JPG, PNG, WebP o GIF de hasta 4 MB." });
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}${IMAGE_TYPES[req.file.mimetype]}`;
  if (useBlob) {
    const { put } = require("@vercel/blob");
    const blob = await put(`productos/${name}`, req.file.buffer, { access: "public", contentType: req.file.mimetype });
    return res.json({ url: blob.url });
  }
  fs.writeFileSync(path.join(config.uploadsDir, name), req.file.buffer);
  res.json({ url: "/uploads/" + name });
});

admin.get("/orders", async (req, res) => {
  const days = Math.min(3650, Math.max(1, parseInt(req.query.days, 10) || 90));
  const rows = (await db.all("SELECT * FROM orders WHERE created_at >= ? ORDER BY created_at DESC", [Date.now() - days * 864e5])).map(rowToOrder);
  res.json({ orders: rows });
});
// Venta presencial en la tienda (punto de venta del panel).
admin.post("/ventas-tienda", async (req, res) => {
  const b = req.body || {};
  const o = await orders.createStoreSale({ items: b.items, payment: b.payment, discount: b.discount, received: b.received, customer: b.customer, seller: req.admin.email });
  res.json({ order: o });
});
admin.patch("/orders/:id", async (req, res) => res.json({ order: await orders.setStatus(req.params.id, String(req.body?.status || ""), { tracking: req.body?.tracking }) }));
admin.post("/orders/:id/confirmar-pago", async (req, res) => {
  const o = await orders.getOrder(req.params.id);
  if (!o) return res.status(404).json({ error: "Pedido no encontrado." });
  res.json({ order: await orders.markPaid(o.id, { ref: "transferencia confirmada por " + req.admin.email }) });
});
admin.post("/orders/:id/reenviar-correo", async (req, res) => {
  const o = await orders.getOrder(req.params.id);
  if (!o) return res.status(404).json({ error: "Pedido no encontrado." });
  const kind = o.channel === "tienda" ? (o.customer.email ? "comprobanteTienda" : null) : o.paymentStatus === "pagado" ? "pedidoConfirmado" : o.payment === "transferencia" && o.status !== "cancelado" ? "pedidoRecibidoTransferencia" : null;
  if (!kind) return res.status(400).json({ error: "Este pedido no tiene correo para reenviar." });
  const r = await mail.send(kind, o);
  if (r.ok === false) return res.status(502).json({ error: "No se pudo enviar: " + r.error });
  res.json({ ok: true });
});
admin.get("/orders.csv", async (req, res) => {
  const rows = [["Pedido", "Canal", "Fecha", "Plazo", "Estado", "Pago", "Estado pago", "Cliente", "RUT", "Teléfono", "Correo", "Entrega", "Dirección", "Comuna", "Producto", "Cantidad", "Precio unit.", "Despacho", "Descuento", "Total pedido"]];
  const f = ms => ms ? new Date(ms).toLocaleString("es-CL", { timeZone: "America/Santiago" }) : "";
  for (const o of (await db.all("SELECT * FROM orders ORDER BY created_at DESC")).map(rowToOrder))
    for (const i of o.items) rows.push([o.id, o.channel === "tienda" ? "Tienda" : "Web", f(o.createdAt), f(o.deadline), o.status, o.payment, o.paymentStatus, o.customer.name, o.customer.rut, o.customer.phone, o.customer.email, o.delivery, o.customer.addr, o.customer.comuna, i.name, i.qty, i.price, o.shipping, o.discount, o.total]);
  const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="pedidos-dondog-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send("\uFEFF" + csv);
});

admin.get("/settings", async (req, res) => res.json({ settings: await getSettings(), status: systemStatus() }));
admin.put("/settings", async (req, res) => {
  const b = req.body || {}, int = (v, d) => Math.max(0, Math.round(Number(v ?? d)));
  res.json({ settings: await setSettings({
    slaHours: Math.max(1, int(b.slaHours, 24)), lowStock: int(b.lowStock, 5), freeShip: int(b.freeShip, 40000),
    shipCost: int(b.shipCost, 3990), shipComunas: String(b.shipComunas || "").slice(0, 1000),
  }) });
});
admin.put("/password", async (req, res) => {
  const { current, next } = req.body || {};
  const a = await db.get("SELECT * FROM admins WHERE id = ?", [req.admin.id]);
  if (!auth.verifyPassword(String(current || ""), a.pass_hash)) return res.status(400).json({ error: "La contraseña actual no es correcta." });
  if (String(next || "").length < 10) return res.status(400).json({ error: "La nueva contraseña debe tener al menos 10 caracteres." });
  await db.run("UPDATE admins SET pass_hash = ? WHERE id = ?", [auth.hashPassword(String(next)), a.id]);
  res.json({ ok: true });
});
admin.post("/test-email", async (req, res) => {
  const to = config.mail.ownerTo || req.admin.email;
  const r = await mail.send("contactoDueno", { name: "Prueba de correo", email: req.admin.email, phone: "", message: `Si lees esto, los correos de la tienda funcionan.\nEnviado a: ${to}` });
  if (r.ok === false) return res.status(502).json({ error: "Falló el envío: " + r.error });
  res.json({ ok: true, smtp: mail.smtpReady, to });
});
admin.get("/mail-log", async (req, res) => res.json({ log: await db.all("SELECT * FROM mail_log ORDER BY id DESC LIMIT 100") }));

const aiUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } });
admin.post("/ai/ficha", aiUpload.single("image"), async (req, res) => {
  if (!ai.enabled()) return res.status(503).json({ error: "La IA no está configurada (falta ANTHROPIC_API_KEY)." });
  const name = String(req.body?.name || "").slice(0, 200);
  const f = req.file && IMAGE_TYPES[req.file.mimetype] ? req.file : null;
  if (!name && !f) return res.status(400).json({ error: "Escribe al menos el nombre o sube una foto." });
  try {
    res.json(await ai.productSheet({ name, image: f && { mediaType: f.mimetype, data: f.buffer.toString("base64") }, categories: products.CATEGORIES }));
  } catch (e) { console.error("[ia] ficha:", e.message); res.status(502).json({ error: "La IA no respondió. Intenta otra vez." }); }
});
admin.post("/ai/stock", async (req, res) => {
  if (!ai.enabled()) return res.status(503).json({ error: "La IA no está configurada (falta ANTHROPIC_API_KEY)." });
  const from = Date.now() - 30 * 864e5, sold = {};
  for (const o of (await db.all("SELECT * FROM orders WHERE created_at >= ? AND payment_status = 'pagado'", [from])).map(rowToOrder))
    for (const i of o.items) sold[i.id] = (sold[i.id] || 0) + i.qty;
  const rows = (await products.listProducts({ includeInactive: true })).map(p => ({ producto: p.name, categoria: p.category, precio: p.price, stock: p.stock, vendidos30d: sold[p.id] || 0 }));
  try { res.json({ text: await ai.stockAnalysis({ rows, lowStock: (await getSettings()).lowStock }) }); }
  catch (e) { console.error("[ia] stock:", e.message); res.status(502).json({ error: "La IA no respondió. Intenta otra vez." }); }
});

app.use("/api/admin", admin);

// ---------- SEO ----------
app.get("/robots.txt", (req, res) => res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /pago/\nSitemap: ${config.siteUrl}/sitemap.xml\n`));
app.get("/sitemap.xml", async (req, res) => {
  const urls = [`<url><loc>${config.siteUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`]
    .concat((await products.listProducts()).map(p => `<url><loc>${config.siteUrl}/producto/${p.slug}</loc><lastmod>${new Date(p.updatedAt).toISOString().slice(0, 10)}</lastmod></url>`));
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
});

const escAttr = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const jsonLd = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
const absImg = src => !src ? `${config.siteUrl}/img/og-tienda.jpg` : src.startsWith("http") ? src : config.siteUrl + src;

function renderIndex({ title, description, image, url, ld = [] } = {}) {
  let html = INDEX;
  const storeLd = {
    "@context": "https://schema.org", "@type": "PetStore", name: config.store.name, url: config.siteUrl, image: `${config.siteUrl}/img/og-tienda.jpg`,
    address: { "@type": "PostalAddress", streetAddress: "Candelaria Goyenechea 3820, local 165", addressLocality: "Vitacura", addressRegion: "Región Metropolitana", addressCountry: "CL" },
    ...(config.store.phone ? { telephone: config.store.phone } : {}),
    sameAs: config.store.instagram ? [`https://www.instagram.com/${config.store.instagram}/`] : [],
  };
  if (title) html = html.replace(/<title>[^<]*<\/title>/, `<title>${escAttr(title)}</title>`).replace(/(<meta property="og:title" content=")[^"]*/, `$1${escAttr(title)}`);
  if (description) html = html.replace(/(<meta name="description" content=")[^"]*/, `$1${escAttr(description)}`).replace(/(<meta property="og:description" content=")[^"]*/, `$1${escAttr(description)}`);
  html = html.replace(/(<meta property="og:image" content=")[^"]*/, `$1${escAttr(image || `${config.siteUrl}/img/og-tienda.jpg`)}`);
  const canonical = url || `${config.siteUrl}/`;
  html = html.replace("</head>", `<link rel="canonical" href="${escAttr(canonical)}">\n<meta property="og:url" content="${escAttr(canonical)}">\n${[storeLd, ...ld].map(jsonLd).join("\n")}\n</head>`);
  return html;
}

app.get("/producto/:slug", async (req, res) => {
  const p = await products.getBySlug(req.params.slug);
  if (!p) return res.status(404).type("html").send(renderIndex({ title: "Producto no encontrado | Don Dog" }));
  const url = `${config.siteUrl}/producto/${p.slug}`;
  res.type("html").send(renderIndex({
    title: `${p.name} | Don Dog Pet shop Vitacura`, description: (p.description || p.name).slice(0, 160), image: absImg(p.image), url,
    ld: [{
      "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, image: absImg(p.image), sku: p.id,
      ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
      offers: { "@type": "Offer", url, priceCurrency: "CLP", price: p.price, availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", seller: { "@type": "Organization", name: config.store.name } },
    }],
  }));
});
app.get(["/", "/admin", "/seguimiento", "/terminos", "/privacidad", "/devoluciones"], (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.type("html").send(renderIndex({}));
});

// ---------- archivos estáticos (en Vercel los sirve la CDN antes de llegar aquí) ----------
app.use("/uploads", express.static(config.uploadsDir, { maxAge: "30d", immutable: true, fallthrough: false }));
app.use(express.static(PUBLIC, { index: false, maxAge: config.production ? "1h" : 0 }));

// ---------- errores ----------
app.use("/api", (req, res) => res.status(404).json({ error: "Ruta no encontrada." }));
app.use((req, res) => res.status(404).type("html").send(renderIndex({ title: "Página no encontrada | Don Dog" })));
app.use((err, req, res, next) => {
  const status = err.status || (err instanceof multer.MulterError ? 400 : 500);
  if (status >= 500) console.error(err);
  const msg = err instanceof multer.MulterError ? "Archivo inválido o demasiado grande." : status >= 500 ? "Error interno. Intenta de nuevo." : err.message;
  if (req.path.startsWith("/api/")) return res.status(status).json({ error: msg });
  res.status(status).type("text/plain").send(msg);
});

if (require.main === module) {
  app.listen(config.port, async () => {
    const st = systemStatus();
    console.log(`Don Dog lista en ${config.siteUrl} (puerto ${config.port})`);
    console.log(`  Base de datos: ${process.env.TURSO_DATABASE_URL || process.env.TURSO_URL ? "Turso" : "archivo local"} · Fotos: ${useBlob ? "Vercel Blob" : "carpeta local"}`);
    console.log(`  Webpay: ${st.webpay} · Mercado Pago: ${st.mercadopago ? "sí" : "no"} · Transferencia: ${st.transfer ? "sí" : "sin datos bancarios"}`);
    console.log(`  Correo SMTP: ${st.smtp ? "configurado" : "NO configurado (se guardan en la carpeta outbox)"} · Aviso al dueño: ${st.ownerEmail ? "sí" : "falta MAIL_OWNER_TO"} · IA: ${st.ai ? "sí" : "no"}`);
    if (!await db.get("SELECT 1 FROM admins LIMIT 1")) console.log("  ⚠ No hay administrador. Crea uno con: npm run crear-admin -- correo@dominio.cl");
  });
}

module.exports = app;
