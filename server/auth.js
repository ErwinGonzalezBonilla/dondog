// Login del dueño: contraseña con scrypt y sesión en cookie firmada (HMAC).
const crypto = require("node:crypto");
const config = require("./config");
const { db } = require("./db");

const COOKIE = "dd_admin";
const MAX_AGE = 14 * 24 * 3600; // 14 días

function hashPassword(pass) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pass, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
function verifyPassword(pass, stored) {
  const [alg, saltHex, hashHex] = String(stored).split("$");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const hash = crypto.scryptSync(pass, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === hash.length && crypto.timingSafeEqual(expected, hash);
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", config.sessionSecret).update(body).digest("base64url");
  return `${body}.${mac}`;
}
function unsign(token) {
  const [body, mac] = String(token || "").split(".");
  if (!body || !mac) return null;
  const good = crypto.createHmac("sha256", config.sessionSecret).update(body).digest("base64url");
  if (good.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(mac))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

async function currentAdmin(req) {
  const p = unsign(parseCookies(req)[COOKIE]);
  if (!p) return null;
  const a = await db.get("SELECT id, email, name FROM admins WHERE id = ?", [p.uid]);
  return a ? { id: Number(a.id), email: a.email, name: a.name } : null;
}

function setSessionCookie(res, adminId) {
  const token = sign({ uid: adminId, exp: Date.now() + MAX_AGE * 1000 });
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${config.production ? "; Secure" : ""}`);
}
function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${config.production ? "; Secure" : ""}`);
}

async function requireAdmin(req, res, next) {
  try {
    const a = await currentAdmin(req);
    if (!a) return res.status(401).json({ error: "Inicia sesión como administrador." });
    // Protección CSRF básica: las escrituras deben venir del mismo sitio.
    if (req.method !== "GET" && req.headers["x-requested-with"] !== "fetch") return res.status(403).json({ error: "Solicitud no permitida." });
    req.admin = a;
    next();
  } catch (e) { next(e); }
}

// Límite de intentos de login por IP.
const attempts = new Map();
function loginAllowed(ip) {
  const now = Date.now(), a = attempts.get(ip) || { n: 0, t: now };
  if (now - a.t > 15 * 60e3) { a.n = 0; a.t = now; }
  attempts.set(ip, a);
  return a.n < 10;
}
function loginFailed(ip) { const a = attempts.get(ip); if (a) a.n++; }

async function createAdmin(email, pass, name = "") {
  email = String(email).trim().toLowerCase();
  const existing = await db.get("SELECT id FROM admins WHERE email = ?", [email]);
  if (existing) {
    await db.run("UPDATE admins SET pass_hash = ?, name = COALESCE(NULLIF(?, ''), name) WHERE id = ?", [hashPassword(pass), name, existing.id]);
    return { id: Number(existing.id), updated: true };
  }
  const r = await db.run("INSERT INTO admins(email, name, pass_hash, created_at) VALUES(?, ?, ?, ?)", [email, name, hashPassword(pass), Date.now()]);
  return { id: r.lastId, updated: false };
}

module.exports = {
  hashPassword, verifyPassword, currentAdmin, setSessionCookie, clearSessionCookie,
  requireAdmin, loginAllowed, loginFailed, createAdmin,
};
