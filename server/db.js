// Base de datos con libSQL: archivo SQLite local o Turso (nube) si hay TURSO_DATABASE_URL.
// En Vercel el disco no es persistente, así que ahí se usa Turso.
const path = require("node:path");
const { createClient } = require("@libsql/client");
const config = require("./config");

const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || "file:" + (process.env.DB_FILE || path.join(config.dataDir, "tienda.db"));
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || process.env.TURSO_DATABASE_AUTH_TOKEN || undefined });
const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  category TEXT NOT NULL,
  pet TEXT DEFAULT 'perro',
  price INTEGER NOT NULL,
  old_price INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  image TEXT DEFAULT '',
  featured INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  access_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deadline INTEGER,
  status TEXT NOT NULL,            -- pendiente_pago | nuevo | preparando | listo | enviado | retirado | entregado | cancelado
  payment_method TEXT NOT NULL,    -- webpay | mercadopago | transferencia
  payment_status TEXT NOT NULL,    -- pendiente | pagado | rechazado | expirado
  payment_ref TEXT DEFAULT '',
  payment_detail TEXT DEFAULT '{}',
  paid_at INTEGER,
  hold_until INTEGER,
  delivery TEXT NOT NULL,          -- despacho | retiro
  customer TEXT NOT NULL,          -- JSON {name,email,phone,rut,addr,comuna,notes}
  items TEXT NOT NULL,             -- JSON [{id,name,qty,price}]
  subtotal INTEGER NOT NULL,
  shipping INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status_at INTEGER,
  tracking TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS orders_status ON orders(status);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  pass_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS mail_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  to_addr TEXT, subject TEXT, kind TEXT, ok INTEGER, error TEXT
);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
`;

let ready = null;
function init() {
  if (!ready) {
    ready = (async () => {
      if (url.startsWith("file:")) await client.execute("PRAGMA journal_mode = WAL");
      await client.executeMultiple(SCHEMA);
    })().catch(e => { ready = null; throw e; });
  }
  return ready;
}

// Envoltorio con la misma interfaz para el cliente y para una transacción.
function wrapExec(exec) {
  const run = async (sql, args = []) => { const r = await exec({ sql, args }); return { changes: r.rowsAffected, lastId: r.lastInsertRowid === undefined ? null : Number(r.lastInsertRowid) }; };
  const all = async (sql, args = []) => (await exec({ sql, args })).rows;
  const get = async (sql, args = []) => (await exec({ sql, args })).rows[0] || null;
  return { run, all, get };
}
const db = wrapExec(async stmt => { await init(); return client.execute(stmt); });

// Ejecuta fn(t) dentro de una transacción de escritura (rollback si lanza error).
async function tx(fn) {
  await init();
  const t = await client.transaction("write");
  try {
    const r = await fn(wrapExec(stmt => t.execute(stmt)));
    await t.commit();
    return r;
  } catch (e) {
    try { await t.rollback(); } catch {}
    throw e;
  } finally { t.close(); }
}

const DEFAULT_SETTINGS = { slaHours: 24, lowStock: 5, freeShip: 40000, shipCost: 3990, shipComunas: "" };

async function getSettings(d = db) {
  const out = { ...DEFAULT_SETTINGS };
  for (const r of await d.all("SELECT key, value FROM settings")) {
    try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
  }
  return out;
}
async function setSettings(obj) {
  for (const [k, v] of Object.entries(obj)) {
    if (k in DEFAULT_SETTINGS) await db.run("INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [k, JSON.stringify(v)]);
  }
  return getSettings();
}

const num = v => (v === null || v === undefined ? v : Number(v));
function rowToProduct(r) {
  if (!r) return null;
  return {
    id: r.id, slug: r.slug, name: r.name, brand: r.brand, category: r.category, pet: r.pet,
    price: num(r.price), oldPrice: num(r.old_price), description: r.description,
    tags: safeJson(r.tags, []), image: r.image, featured: !!r.featured, active: !!r.active,
    stock: num(r.stock), createdAt: num(r.created_at), updatedAt: num(r.updated_at),
  };
}
function rowToOrder(r) {
  if (!r) return null;
  return {
    id: r.id, accessKey: r.access_key, createdAt: num(r.created_at), deadline: num(r.deadline), status: r.status,
    payment: r.payment_method, paymentStatus: r.payment_status, paymentRef: r.payment_ref,
    paymentDetail: safeJson(r.payment_detail, {}), paidAt: num(r.paid_at), holdUntil: num(r.hold_until),
    delivery: r.delivery, customer: safeJson(r.customer, {}), items: safeJson(r.items, []),
    subtotal: num(r.subtotal), shipping: num(r.shipping), total: num(r.total), statusAt: num(r.status_at), tracking: r.tracking,
  };
}
function safeJson(s, d) { try { return JSON.parse(s); } catch { return d; } }

module.exports = { db, tx, init, client, getSettings, setSettings, rowToProduct, rowToOrder, DEFAULT_SETTINGS };
