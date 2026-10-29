// Envía un correo de prueba con cada plantilla a la dirección indicada.
// Uso: npm run probar-correo -- tu@correo.cl
const mail = require("../mail");
const config = require("../config");

const to = process.argv[2];
if (!to) { console.error("Uso: npm run probar-correo -- tu@correo.cl"); process.exit(1); }

const now = Date.now();
const order = {
  id: "DD-PRUEBA", accessKey: "demo", createdAt: now, deadline: now + 24 * 3600e3, status: "listo", payment: "webpay",
  paymentStatus: "pagado", paymentDetail: { authorizationCode: "1213", cardLast4: "6623" }, delivery: "despacho", tracking: "",
  customer: { name: "Cliente de Prueba", email: to, phone: "+56 9 1234 5678", rut: "", addr: "Av. Vitacura 1234, depto 51", comuna: "Vitacura", notes: "Dejar en conserjería" },
  items: [{ id: "p01", name: "Collar isabelino acolchado de tela", qty: 1, price: 14990 }, { id: "p02", name: "Beaphar CaniComfort collar calmante", qty: 2, price: 21990 }],
  subtotal: 58970, shipping: 0, total: 58970,
};

(async () => {
  const sends = [
    ["pedidoConfirmado", order],
    ["pedidoRecibidoTransferencia", { ...order, payment: "transferencia", paymentStatus: "pendiente" }],
    ["estadoPedido", order],
    ["pedidoExpirado", order],
  ];
  // Los avisos al dueño van a MAIL_OWNER_TO; para la prueba los redirigimos.
  const owner = config.mail.ownerTo; config.mail.ownerTo = to;
  sends.push(["avisoNuevoPedido", order], ["avisoStockBajo", [{ name: "Snack dental", stock: 2 }, { name: "Shampoo avena", stock: 0 }]],
    ["contactoDueno", { name: "Cliente de Prueba", email: to, phone: "", message: "Hola, ¿tienen arnés talla M?" }], ["contactoCliente", { name: "Cliente de Prueba", email: to, message: "Hola, ¿tienen arnés talla M?" }]);
  for (const [kind, data] of sends) {
    const r = await mail.send(kind, data);
    console.log(`${r.ok ? "✓" : "✗"} ${kind}${r.error ? " · " + r.error : ""}`);
  }
  config.mail.ownerTo = owner;
  if (!mail.smtpReady) console.log("\nSMTP no configurado: los correos quedaron en server/data/outbox/ (ábrelos en el navegador).");
})();
