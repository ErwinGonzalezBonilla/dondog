// Pruebas de punta a punta de la API (base de datos temporal, Webpay simulado, correos a carpeta).
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dondog-test-"));
Object.assign(process.env, {
  DATA_DIR: tmp, SITE_URL: "http://localhost", NODE_ENV: "test", SESSION_SECRET: "test", MAIL_OWNER_TO: "dueno@test.cl",
  TRANSFER_ACCOUNT_NUMBER: "123", WEBPAY_ENABLED: "true", WEBPAY_ENV: "integration", SMTP_HOST: "", TURSO_DATABASE_URL: "",
});

// Webpay simulado: create devuelve token; commit autoriza salvo token "rechazar".
const tbk = require("transbank-sdk");
const fakeTx = {
  create: async (buyOrder, sessionId, amount) => { fakeTx.amounts[buyOrder] = amount; return { token: "tok-" + buyOrder, url: "https://webpay.test/init" }; },
  commit: async token => {
    const buyOrder = token.replace(/^tok-/, "").replace(/-rechazar$/, "");
    const ok = !token.endsWith("-rechazar");
    return { buy_order: buyOrder, status: ok ? "AUTHORIZED" : "FAILED", response_code: ok ? 0 : -1, amount: fakeTx.amounts[buyOrder], authorization_code: "1213", card_detail: { card_number: "6623" } };
  },
  status: async () => { throw new Error("no"); },
  amounts: {},
};
tbk.WebpayPlus.Transaction.buildForIntegration = () => fakeTx;

const app = require("../server/server");
const { createAdmin } = require("../server/auth");
const { saveProduct } = require("../server/products");
let server, base, cookie = "";

async function call(method, url, body, { form, admin } = {}) {
  const headers = { "X-Requested-With": "fetch" };
  if (admin) headers.Cookie = cookie;
  let payload;
  if (form) { headers["Content-Type"] = "application/x-www-form-urlencoded"; payload = new URLSearchParams(body).toString(); }
  else if (body) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const r = await fetch(base + url, { method, headers, body: payload, redirect: "manual" });
  const sc = r.headers.get("set-cookie"); if (sc) cookie = sc.split(";")[0];
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text, location: r.headers.get("location") };
}
const stockOf = async id => (await call("GET", "/api/catalog")).json.products.find(p => p.id === id)?.stock;
const customer = { name: "Ana Pérez", email: "ana@test.cl", phone: "+56912345678", addr: "Av. Uno 1", comuna: "Vitacura" };
const outbox = () => fs.existsSync(path.join(tmp, "outbox")) ? fs.readdirSync(path.join(tmp, "outbox")) : [];
const waitMail = async kind => { for (let i = 0; i < 50; i++) { if (outbox().some(f => f.includes(kind))) return true; await new Promise(r => setTimeout(r, 20)); } return false; };

before(async () => {
  await saveProduct({ id: "a1", name: "Collar", category: "accesorios", price: 10000, stock: 5 });
  await saveProduct({ id: "a2", name: "Snack", category: "snacks", price: 3000, stock: 1 });
  await createAdmin("admin@test.cl", "claveSegura123");
  server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test("catálogo público", async () => {
  const r = await call("GET", "/api/catalog");
  assert.equal(r.status, 200);
  assert.equal(r.json.products.length, 2);
  assert.ok(r.json.payments.webpay && r.json.payments.transferencia);
});

test("Webpay aprobado: descuenta stock, marca pagado y envía correos", async () => {
  const r = await call("POST", "/api/orders", { items: [{ id: "a1", qty: 2 }], customer, delivery: "despacho", payment: "webpay" });
  assert.equal(r.status, 200);
  assert.equal(r.json.pay.type, "form");
  assert.equal(r.json.order.total, 23990); // 20.000 + despacho 3.990
  assert.equal(await stockOf("a1"), 3);
  const back = await call("POST", "/pago/webpay/retorno", { token_ws: r.json.pay.fields.token_ws }, { form: true });
  assert.equal(back.status, 303);
  assert.match(back.location, /pago=ok/);
  const o = await call("GET", `/api/orders/${r.json.order.id}?k=${r.json.key}`);
  assert.equal(o.json.order.paymentStatus, "pagado");
  assert.equal(o.json.order.cardLast4, "6623");
  assert.ok(await waitMail("pedidoConfirmado"));
  assert.ok(await waitMail("avisoNuevoPedido"));
  // Recargar el retorno no duplica nada.
  await call("POST", "/pago/webpay/retorno", { token_ws: r.json.pay.fields.token_ws }, { form: true });
  assert.equal(await stockOf("a1"), 3);
});

test("Webpay anulado devuelve el stock", async () => {
  const r = await call("POST", "/api/orders", { items: [{ id: "a1", qty: 1 }], customer, delivery: "retiro", payment: "webpay" });
  assert.equal(await stockOf("a1"), 2);
  const back = await call("POST", "/pago/webpay/retorno", { TBK_TOKEN: "x", TBK_ORDEN_COMPRA: r.json.order.id }, { form: true });
  assert.match(back.location, /pago=rechazado/);
  assert.equal(await stockOf("a1"), 3);
});

test("no se puede vender más que el stock", async () => {
  const r = await call("POST", "/api/orders", { items: [{ id: "a2", qty: 2 }], customer, delivery: "retiro", payment: "transferencia" });
  assert.equal(r.status, 409);
  const results = await Promise.all([1, 2, 3].map(() => call("POST", "/api/orders", { items: [{ id: "a2", qty: 1 }], customer, delivery: "retiro", payment: "transferencia" })));
  assert.equal(results.filter(x => x.status === 200).length, 1);
  assert.equal(await stockOf("a2"), 0);
});

test("panel: login, confirmar transferencia, cambiar estado y cancelar", async () => {
  assert.equal((await call("GET", "/api/admin/orders", null, { admin: true })).status, 401);
  assert.equal((await call("POST", "/api/admin/login", { email: "admin@test.cl", password: "mala" })).status, 401);
  assert.equal((await call("POST", "/api/admin/login", { email: "ADMIN@test.cl", password: "claveSegura123" })).status, 200);
  const list = (await call("GET", "/api/admin/orders", null, { admin: true })).json.orders;
  const t = list.find(o => o.payment === "transferencia" && o.status === "pendiente_pago");
  const paid = await call("POST", `/api/admin/orders/${t.id}/confirmar-pago`, null, { admin: true });
  assert.equal(paid.json.order.paymentStatus, "pagado");
  const st = await call("PATCH", `/api/admin/orders/${t.id}`, { status: "listo" }, { admin: true });
  assert.equal(st.json.order.status, "listo");
  assert.ok(await waitMail("estadoPedido"));
  const c = await call("PATCH", `/api/admin/orders/${t.id}`, { status: "cancelado" }, { admin: true });
  assert.equal(c.json.order.status, "cancelado");
  assert.equal(await stockOf("a2"), 1);
});

test("seguimiento por número y correo", async () => {
  const r = await call("POST", "/api/orders", { items: [{ id: "a1", qty: 1 }], customer, delivery: "retiro", payment: "transferencia" });
  assert.equal((await call("POST", "/api/orders/lookup", { id: r.json.order.id, email: "otro@test.cl" })).status, 404);
  const ok = await call("POST", "/api/orders/lookup", { id: r.json.order.id.slice(3).toLowerCase(), email: "ANA@test.cl" });
  assert.equal(ok.status, 200);
  assert.equal((await call("GET", `/api/orders/${r.json.order.id}?k=malo`)).status, 404);
});

test("SEO: ficha de producto con datos estructurados y sitemap", async () => {
  const p = await call("GET", "/producto/collar");
  assert.equal(p.status, 200);
  assert.match(p.text, /<title>Collar \| Don Dog/);
  assert.match(p.text, /"@type":"Product"/);
  assert.match((await call("GET", "/sitemap.xml")).text, /\/producto\/collar/);
});

test("venta en tienda: descuenta stock, calcula vuelto y aparece en el Excel", async () => {
  await call("POST", "/api/admin/login", { email: "admin@test.cl", password: "claveSegura123" });
  await call("PUT", "/api/admin/products/a1", { name: "Collar", category: "accesorios", price: 10000, stock: 4, barcode: "7801234567890" }, { admin: true });
  const dup = await call("POST", "/api/admin/products", { name: "Otro", category: "snacks", price: 1000, barcode: "7801234567890" }, { admin: true });
  assert.equal(dup.status, 400);
  const over = await call("POST", "/api/admin/ventas-tienda", { items: [{ id: "a1", qty: 9 }], payment: "efectivo" }, { admin: true });
  assert.equal(over.status, 409);
  const r = await call("POST", "/api/admin/ventas-tienda", { items: [{ id: "a1", qty: 2 }], payment: "efectivo", discount: 1000, received: 20000, customer: { email: "cliente@test.cl" } }, { admin: true });
  assert.equal(r.status, 200);
  assert.equal(r.json.order.total, 19000);
  assert.equal(r.json.order.channel, "tienda");
  assert.equal(r.json.order.paymentDetail.change, 1000);
  assert.equal(await stockOf("a1"), 2);
  assert.ok(await waitMail("comprobanteTienda"));
  const csv = await call("GET", "/api/admin/orders.csv", null, { admin: true });
  assert.match(csv.text, new RegExp(`"${r.json.order.id}";"Tienda"`));
  // Anular la venta devuelve el stock.
  await call("PATCH", `/api/admin/orders/${r.json.order.id}`, { status: "cancelado" }, { admin: true });
  assert.equal(await stockOf("a1"), 4);
});

test("primer ingreso: solo crea administrador si no existe ninguno", async () => {
  const st = await call("GET", "/api/admin/setup");
  assert.equal(st.json.needed, false);
  const r = await call("POST", "/api/admin/setup", { key: "x", email: "otro@test.cl", password: "claveSegura123" });
  assert.equal(r.status, 409);
});
