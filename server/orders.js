// Lógica de pedidos: reserva de stock, pago, cambios de estado y vencimientos.
const crypto = require("node:crypto");
const config = require("./config");
const { db, tx, getSettings, rowToOrder, rowToProduct } = require("./db");
const mail = require("./mail");
const { background } = require("./background");

const STATUSES = ["pendiente_pago", "nuevo", "preparando", "listo", "enviado", "retirado", "entregado", "cancelado"];
const NOTIFY_STATUSES = ["listo", "enviado", "retirado", "entregado", "cancelado"];

class OrderError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }

function newOrderId() {
  // DD-XXXXXX: corto, legible y sin caracteres ambiguos (32^6 ≈ mil millones de combinaciones).
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (const b of crypto.randomBytes(6)) s += abc[b % abc.length];
  return "DD-" + s;
}

async function getOrder(id, d = db) { return rowToOrder(await d.get("SELECT * FROM orders WHERE id = ?", [String(id)])); }

const clean = (v, max = 200) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

function validateCustomer(c, delivery) {
  const out = {
    name: clean(c?.name, 120), email: clean(c?.email, 160).toLowerCase(), phone: clean(c?.phone, 40),
    rut: clean(c?.rut, 20), addr: clean(c?.addr, 200), comuna: clean(c?.comuna, 80), notes: clean(c?.notes, 400),
  };
  if (!out.name || out.name.length < 3) throw new OrderError("Ingresa tu nombre y apellido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) throw new OrderError("Ingresa un correo válido.");
  if (out.phone.replace(/\D/g, "").length < 8) throw new OrderError("Ingresa un teléfono válido.");
  if (delivery === "despacho" && (!out.addr || !out.comuna)) throw new OrderError("Para despacho necesitamos dirección y comuna.");
  if (delivery === "retiro") { out.addr = ""; out.comuna = ""; }
  return out;
}

function shippingFor(subtotal, delivery, comuna, s) {
  if (delivery === "retiro" || subtotal === 0) return 0;
  if (s.shipComunas) {
    const norm = x => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    const ok = s.shipComunas.split(",").map(norm).filter(Boolean);
    if (ok.length && !ok.includes(norm(comuna))) throw new OrderError(`Por ahora despachamos solo a: ${s.shipComunas}. Puedes elegir retiro en tienda.`);
  }
  return subtotal >= s.freeShip ? 0 : s.shipCost;
}

// Crea el pedido y descuenta stock en una sola transacción.
async function createOrder({ items, customer, delivery, payment }) {
  if (!["despacho", "retiro"].includes(delivery)) throw new OrderError("Elige despacho o retiro.");
  const enabled = { webpay: config.webpay.enabled, mercadopago: config.mercadopago.enabled && !!config.mercadopago.accessToken, transferencia: config.transfer.enabled };
  if (!enabled[payment]) throw new OrderError("Ese medio de pago no está disponible.");
  if (!Array.isArray(items) || !items.length) throw new OrderError("Tu carrito está vacío.");
  if (items.length > 60) throw new OrderError("Demasiados productos en un pedido.");
  const c = validateCustomer(customer, delivery);
  const s = await getSettings();

  const merged = new Map();
  for (const it of items) {
    const q = parseInt(it?.qty, 10);
    if (!it?.id || !(q > 0) || q > 99) throw new OrderError("Cantidad inválida en el carrito.");
    merged.set(String(it.id), (merged.get(String(it.id)) || 0) + q);
  }

  const id = await tx(async t => {
    const lines = [];
    for (const [pid, qty] of merged) {
      const p = rowToProduct(await t.get("SELECT * FROM products WHERE id = ?", [pid]));
      if (!p || !p.active) throw new OrderError("Un producto de tu carrito ya no está disponible. Actualiza la página.", 409);
      if (p.stock < qty) throw new OrderError(p.stock > 0 ? `Solo quedan ${p.stock} de “${p.name}”. Ajusta tu carrito.` : `“${p.name}” se agotó. Quítalo del carrito.`, 409);
      lines.push({ id: p.id, name: p.name, qty, price: p.price });
    }
    const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
    const shipping = shippingFor(subtotal, delivery, c.comuna, s);
    const total = subtotal + shipping;
    if (payment === "webpay" && total < 50) throw new OrderError("Monto mínimo no alcanzado.");

    const now = Date.now();
    for (const l of lines) {
      const r = await t.run("UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ? AND stock >= ?", [l.qty, now, l.id, l.qty]);
      if (r.changes !== 1) throw new OrderError(`Se agotó “${l.name}” mientras comprabas.`, 409);
    }
    let oid = newOrderId();
    while (await t.get("SELECT 1 FROM orders WHERE id = ?", [oid])) oid = newOrderId();
    const holdMs = payment === "transferencia" ? config.transfer.hoursToPay * 3600e3 : config.paymentHoldMinutes * 60e3;
    await t.run(`INSERT INTO orders(id, access_key, created_at, deadline, status, payment_method, payment_status, hold_until,
      delivery, customer, items, subtotal, shipping, total, status_at) VALUES(?, ?, ?, ?, 'pendiente_pago', ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [oid, crypto.randomBytes(12).toString("base64url"), now, now + s.slaHours * 3600e3, payment, now + holdMs,
        delivery, JSON.stringify(c), JSON.stringify(lines), subtotal, shipping, total, now]);
    return oid;
  });
  return getOrder(id);
}

async function restoreStock(t, o) {
  for (const i of o.items) await t.run("UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?", [i.qty, Date.now(), i.id]);
}

// Marca el pedido como pagado (idempotente). Devuelve el pedido actualizado.
async function markPaid(id, { ref = "", detail = {} } = {}) {
  let changed = false;
  const o = await tx(async t => {
    const cur = await getOrder(id, t);
    if (!cur) throw new OrderError("Pedido no encontrado.", 404);
    if (cur.paymentStatus === "pagado") return cur;
    if (cur.status === "cancelado") {
      // Pago que llega después de vencer la reserva: volver a descontar si hay stock.
      for (const i of cur.items) {
        const r = await t.run("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?", [i.qty, i.id, i.qty]);
        if (r.changes !== 1) detail.stockWarning = "Pago recibido después de vencer la reserva; revisar stock.";
      }
    }
    const s = await getSettings(t), now = Date.now();
    await t.run(`UPDATE orders SET payment_status = 'pagado', status = 'nuevo', paid_at = ?, deadline = ?, payment_ref = ?,
      payment_detail = ?, status_at = ?, hold_until = NULL WHERE id = ?`,
      [now, now + s.slaHours * 3600e3, String(ref || cur.paymentRef || ""), JSON.stringify({ ...cur.paymentDetail, ...detail }), now, id]);
    changed = true;
    return getOrder(id, t);
  });
  if (changed) {
    mail.sendLater("pedidoConfirmado", o);
    mail.sendLater("avisoNuevoPedido", o);
    pushToSheets(o);
    background(checkLowStock(o.items.map(i => i.id)));
  }
  return o;
}

// Pago rechazado o abandonado: cancela y devuelve stock (solo si aún no estaba pagado).
async function markFailed(id, reason = "rechazado", detail = {}) {
  return tx(async t => {
    const cur = await getOrder(id, t);
    if (!cur || cur.paymentStatus === "pagado" || cur.status === "cancelado") return cur;
    await restoreStock(t, cur);
    await t.run("UPDATE orders SET status = 'cancelado', payment_status = ?, payment_detail = ?, status_at = ?, hold_until = NULL WHERE id = ?",
      [reason, JSON.stringify({ ...cur.paymentDetail, ...detail }), Date.now(), id]);
    return getOrder(id, t);
  });
}

async function setStatus(id, status, { tracking } = {}) {
  if (!STATUSES.includes(status) || status === "pendiente_pago") throw new OrderError("Estado inválido.");
  const o = await tx(async t => {
    const cur = await getOrder(id, t);
    if (!cur) throw new OrderError("Pedido no encontrado.", 404);
    if (cur.status === "cancelado" && status !== "cancelado") throw new OrderError("Un pedido cancelado no se puede reactivar. Crea uno nuevo.");
    if (status === "cancelado" && cur.status !== "cancelado") await restoreStock(t, cur);
    await t.run("UPDATE orders SET status = ?, status_at = ?, tracking = COALESCE(?, tracking) WHERE id = ?",
      [status, Date.now(), tracking === undefined || tracking === null ? null : clean(tracking, 120), id]);
    return { before: cur, after: await getOrder(id, t) };
  });
  if (o.before.status !== status && NOTIFY_STATUSES.includes(status)) mail.sendLater("estadoPedido", o.after);
  return o.after;
}

// Vence reservas no pagadas (Webpay/MP abandonados y transferencias sin pago).
async function sweepExpired() {
  const rows = await db.all("SELECT id, payment_method FROM orders WHERE status = 'pendiente_pago' AND hold_until IS NOT NULL AND hold_until < ?", [Date.now()]);
  for (const r of rows) {
    const o = await markFailed(r.id, "expirado");
    if (o && r.payment_method === "transferencia") mail.sendLater("pedidoExpirado", o);
  }
  return rows.length;
}

// Aviso de stock bajo al dueño (como máximo uno por producto cada 24 h; se recuerda en la base de datos).
async function checkLowStock(ids) {
  const s = await getSettings(), now = Date.now(), low = [];
  for (const id of ids) {
    const p = rowToProduct(await db.get("SELECT * FROM products WHERE id = ?", [id]));
    if (!p || !p.active || p.stock > s.lowStock) continue;
    const last = await db.get("SELECT value FROM kv WHERE key = ?", ["lowstock:" + id]);
    if (last && now - Number(last.value) < 24 * 3600e3) continue;
    await db.run("INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["lowstock:" + id, now]);
    low.push(p);
  }
  if (low.length) await mail.send("avisoStockBajo", low);
}

// Envía el pedido pagado a Google Sheets (Apps Script Web App), si está configurado.
function pushToSheets(o) {
  if (!config.sheetsWebhook) return;
  const c = o.customer;
  const payload = {
    pedido: o.id, fecha: new Date(o.createdAt).toISOString(), plazo: new Date(o.deadline).toISOString(), estado: o.status,
    cliente: c.name, telefono: c.phone, correo: c.email, rut: c.rut, entrega: o.delivery, direccion: c.addr, comuna: c.comuna,
    pago: o.payment, total: o.total, items: o.items.map(i => ({ producto: i.name, cantidad: i.qty, precio: i.price })),
  };
  background(fetch(config.sheetsWebhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), redirect: "follow" })
    .catch(e => console.error("[sheets] No se pudo enviar el pedido", o.id, e.message)));
}

// Vista pública (lo que puede ver el cliente con su enlace).
function publicOrder(o) {
  return {
    id: o.id, createdAt: o.createdAt, deadline: o.deadline, status: o.status, payment: o.payment, paymentStatus: o.paymentStatus,
    delivery: o.delivery, items: o.items, subtotal: o.subtotal, shipping: o.shipping, total: o.total, tracking: o.tracking,
    holdUntil: o.holdUntil, customer: { name: o.customer.name, email: o.customer.email, addr: o.customer.addr, comuna: o.customer.comuna },
    transfer: o.payment === "transferencia" && o.paymentStatus === "pendiente" && o.status !== "cancelado" ? transferInfo() : undefined,
    authorizationCode: o.paymentDetail?.authorizationCode, cardLast4: o.paymentDetail?.cardLast4,
  };
}
function transferInfo() {
  const t = config.transfer;
  return { holder: t.holder, rut: t.rut, bank: t.bank, accountType: t.accountType, accountNumber: t.accountNumber, email: t.email, hoursToPay: t.hoursToPay };
}

module.exports = {
  OrderError, STATUSES, createOrder, getOrder, markPaid, markFailed, setStatus, sweepExpired,
  checkLowStock, publicOrder, transferInfo, pushToSheets,
};
