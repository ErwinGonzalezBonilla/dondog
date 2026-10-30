// Correos transaccionales de la tienda (SMTP con nodemailer).
// Si SMTP no está configurado, los correos se guardan en server/data/outbox/ para revisarlos.
const fs = require("node:fs");
const path = require("node:path");
const nodemailer = require("nodemailer");
const config = require("./config");
const { db } = require("./db");
const { background } = require("./background");

const smtpReady = !!(config.mail.host && config.mail.user && config.mail.pass);
const transport = smtpReady
  ? nodemailer.createTransport({
      host: config.mail.host, port: config.mail.port, secure: config.mail.secure,
      auth: { user: config.mail.user, pass: config.mail.pass },
    })
  : null;
const outbox = path.join(config.dataDir, "outbox");

const clp = n => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Math.round(n || 0));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fecha = ms => new Date(ms).toLocaleString("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const PAY_NAMES = { webpay: "Webpay (débito / crédito)", mercadopago: "Mercado Pago", transferencia: "Transferencia bancaria", efectivo: "Efectivo", debito: "Tarjeta de débito", credito: "Tarjeta de crédito" };

// ---------- plantilla base ----------
function layout({ preheader = "", title, body }) {
  const s = config.store, site = config.siteUrl;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F3EEE7;font-family:Arial,Helvetica,sans-serif;color:#16120E">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EEE7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden">
  <tr><td style="background:#0E0D0B;padding:22px 28px" align="left">
    <a href="${site}" style="text-decoration:none;color:#F8F4EE"><img src="${site}/img/logo-email.png" width="48" height="48" alt="" style="vertical-align:middle;border:0;border-radius:50%">
    <span style="font-size:24px;font-weight:900;letter-spacing:1px;text-transform:uppercase;vertical-align:middle;margin-left:10px;color:#F8F4EE">${esc(s.name)}</span></a>
  </td></tr>
  <tr><td style="padding:28px 28px 8px">
    <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;color:#16120E">${esc(title)}</h1>
    ${body}
  </td></tr>
  <tr><td style="padding:20px 28px 28px;border-top:1px solid #E6DCCF;font-size:12px;color:#76685A;line-height:1.6">
    <b style="color:#16120E">${esc(s.name)} · Pet shop</b><br>${esc(s.address)}<br>
    ${s.hours ? esc(s.hours) + "<br>" : ""}${s.phone ? "Teléfono " + esc(s.phone) + " · " : ""}${s.instagram ? `<a href="https://www.instagram.com/${esc(s.instagram)}/" style="color:#C8285F">@${esc(s.instagram)}</a> · ` : ""}<a href="${site}" style="color:#C8285F">${esc(site.replace(/^https?:\/\//, ""))}</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}
const p = t => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${t}</p>`;
const btn = (href, label) => `<p style="margin:20px 0"><a href="${href}" style="display:inline-block;background:#C8285F;color:#FFFFFF;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:999px">${esc(label)}</a></p>`;
const box = (html, bg = "#F8F4EE") => `<div style="background:${bg};border-radius:10px;padding:14px 16px;margin:0 0 16px;font-size:14px;line-height:1.55">${html}</div>`;

function itemsTable(o) {
  const rows = o.items.map(i => `<tr><td style="padding:8px 0;border-bottom:1px solid #EFE6DA;font-size:14px">${i.qty} × ${esc(i.name)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #EFE6DA;font-size:14px;white-space:nowrap">${clp(i.qty * i.price)}</td></tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px">${rows}
  <tr><td style="padding:8px 0 2px;font-size:14px;color:#76685A">Subtotal</td><td align="right" style="padding:8px 0 2px;font-size:14px;color:#76685A">${clp(o.subtotal)}</td></tr>
  ${o.discount ? `<tr><td style="padding:2px 0;font-size:14px;color:#76685A">Descuento</td><td align="right" style="padding:2px 0;font-size:14px;color:#76685A">−${clp(o.discount)}</td></tr>` : ""}
  ${o.channel === "tienda" ? "" : `<tr><td style="padding:2px 0;font-size:14px;color:#76685A">${o.delivery === "retiro" ? "Retiro en tienda" : "Despacho"}</td><td align="right" style="padding:2px 0;font-size:14px;color:#76685A">${o.shipping ? clp(o.shipping) : "Gratis"}</td></tr>`}
  <tr><td style="padding:8px 0;font-size:17px;font-weight:bold">Total</td><td align="right" style="padding:8px 0;font-size:17px;font-weight:bold">${clp(o.total)}</td></tr></table>`;
}
function deliveryBlock(o) {
  const c = o.customer;
  return o.delivery === "retiro"
    ? box(`<b>Retiro en tienda</b><br>${esc(config.store.address)}<br>${esc(config.store.hours)}<br>Te avisamos por correo cuando esté listo para retirar.`)
    : box(`<b>Despacho a domicilio</b><br>${esc(c.name)}<br>${esc(c.addr)}, ${esc(c.comuna)}${c.notes ? `<br><i>${esc(c.notes)}</i>` : ""}`);
}
const orderLink = o => `${config.siteUrl}/?pedido=${encodeURIComponent(o.id)}&k=${encodeURIComponent(o.accessKey)}`;
function transferBlock(o) {
  const t = config.transfer;
  return box(`<b>Datos para transferir ${clp(o.total)}</b><br>
    Titular: ${esc(t.holder)}<br>RUT: ${esc(t.rut)}<br>Banco: ${esc(t.bank)}<br>Cuenta: ${esc(t.accountType)} N° ${esc(t.accountNumber)}<br>
    ${t.email ? `Correo comprobante: ${esc(t.email)}<br>` : ""}Asunto / comentario: <b>${esc(o.id)}</b>`, "#FBE1EA");
}

// ---------- correos ----------
const templates = {
  // Cliente eligió transferencia: pedido reservado, esperando pago.
  pedidoRecibidoTransferencia: o => ({
    to: o.customer.email,
    subject: `Recibimos tu pedido ${o.id} · falta la transferencia`,
    html: layout({
      preheader: `Transfiere ${clp(o.total)} para confirmar tu pedido.`,
      title: `¡Gracias, ${o.customer.name.split(" ")[0]}! Reservamos tu pedido`,
      body: p(`Tu pedido <b>${esc(o.id)}</b> está reservado por ${config.transfer.hoursToPay} horas. Para confirmarlo, transfiere el total y envía el comprobante.`)
        + transferBlock(o) + itemsTable(o) + deliveryBlock(o)
        + p(`Apenas confirmemos el pago te enviaremos otro correo y empezaremos a preparar tu pedido.`) + btn(orderLink(o), "Ver mi pedido"),
    }),
  }),

  // Pago confirmado (Webpay, Mercado Pago o transferencia validada por el dueño).
  pedidoConfirmado: o => ({
    to: o.customer.email,
    subject: `Pedido ${o.id} confirmado · Don Dog`,
    html: layout({
      preheader: `Pago recibido. Lo preparamos antes del ${fecha(o.deadline)}.`,
      title: `¡Pago recibido! Tu pedido está confirmado`,
      body: p(`Hola ${esc(o.customer.name.split(" ")[0])}, recibimos el pago de tu pedido <b>${esc(o.id)}</b> con ${esc(PAY_NAMES[o.payment] || o.payment)}.`)
        + box(`Lo dejamos preparado antes del <b>${esc(fecha(o.deadline))}</b>.`, "#DCF0E5")
        + itemsTable(o) + deliveryBlock(o)
        + (o.paymentDetail?.authorizationCode ? p(`<span style="font-size:13px;color:#76685A">Código de autorización: ${esc(o.paymentDetail.authorizationCode)}${o.paymentDetail.cardLast4 ? ` · Tarjeta terminada en ${esc(o.paymentDetail.cardLast4)}` : ""}</span>`) : "")
        + btn(orderLink(o), "Seguir mi pedido")
        + p(`¿Dudas? Responde este correo o escríbenos por Instagram.`),
    }),
  }),

  // Cambio de estado del pedido.
  estadoPedido: o => {
    const first = esc(o.customer.name.split(" ")[0]);
    const msgs = {
      preparando: [`Estamos preparando tu pedido ${o.id}`, `Hola ${first}, ya estamos armando tu pedido.`],
      listo: o.delivery === "retiro"
        ? [`Tu pedido ${o.id} está listo para retirar`, `Hola ${first}, tu pedido te espera en la tienda. Trae el número de pedido <b>${esc(o.id)}</b>.`]
        : [`Tu pedido ${o.id} está listo para despacho`, `Hola ${first}, tu pedido está empacado y sale pronto.`],
      enviado: [`Tu pedido ${o.id} va en camino`, `Hola ${first}, tu pedido salió a despacho.${o.tracking ? ` Seguimiento: <b>${esc(o.tracking)}</b>.` : ""}`],
      retirado: [`Retiraste tu pedido ${o.id}`, `Gracias por pasar por la tienda, ${first}. ¡Que lo disfruten!`],
      entregado: [`Entregamos tu pedido ${o.id}`, `Hola ${first}, tu pedido fue entregado. ¡Que lo disfruten!`],
      cancelado: [`Tu pedido ${o.id} fue cancelado`, `Hola ${first}, tu pedido fue cancelado. Si ya pagaste, te contactaremos para la devolución. Si crees que es un error, responde este correo.`],
    };
    const m = msgs[o.status];
    if (!m) return null;
    return {
      to: o.customer.email, subject: `${m[0]} · Don Dog`,
      html: layout({
        preheader: m[0], title: m[0],
        body: p(m[1]) + (o.status === "listo" ? deliveryBlock(o) : "") + itemsTable(o) + btn(orderLink(o), "Ver mi pedido"),
      }),
    };
  },

  // Transferencia no recibida a tiempo.
  pedidoExpirado: o => ({
    to: o.customer.email,
    subject: `Tu pedido ${o.id} se canceló por falta de pago`,
    html: layout({
      preheader: "No recibimos la transferencia a tiempo.", title: "Liberamos tu reserva",
      body: p(`Hola ${esc(o.customer.name.split(" ")[0])}, no recibimos la transferencia del pedido <b>${esc(o.id)}</b> dentro de ${config.transfer.hoursToPay} horas, así que liberamos los productos.`)
        + p(`Si ya transferiste, responde este correo con el comprobante y lo reactivamos.`) + btn(config.siteUrl, "Volver a la tienda"),
    }),
  }),

  // Aviso al dueño: nuevo pedido.
  avisoNuevoPedido: o => {
    const c = o.customer;
    return {
      to: config.mail.ownerTo, replyTo: c.email,
      subject: `🛒 Nuevo pedido ${o.id} · ${clp(o.total)} · ${o.paymentStatus === "pagado" ? "PAGADO" : "esperando transferencia"}`,
      html: layout({
        preheader: `${c.name} · ${clp(o.total)}`, title: `Nuevo pedido ${o.id}`,
        body: box(`<b>${o.paymentStatus === "pagado" ? "Pagado" : "Pendiente de transferencia"}</b> con ${esc(PAY_NAMES[o.payment])}<br>Preparar antes del <b>${esc(fecha(o.deadline))}</b>`, o.paymentStatus === "pagado" ? "#DCF0E5" : "#FFF1D6")
          + box(`<b>${esc(c.name)}</b><br>${esc(c.email)} · ${esc(c.phone)}${c.rut ? `<br>RUT ${esc(c.rut)}` : ""}`)
          + deliveryBlock(o) + itemsTable(o) + btn(`${config.siteUrl}/admin`, "Abrir panel"),
      }),
    };
  },

  // Comprobante de compra presencial (si el cliente dejó su correo).
  comprobanteTienda: o => ({
    to: o.customer.email,
    subject: `Tu compra en Don Dog · ${o.id}`,
    html: layout({
      preheader: `Gracias por tu compra de ${clp(o.total)}.`, title: "¡Gracias por tu compra!",
      body: p(`Este es el detalle de tu compra en la tienda Don Dog del ${esc(fecha(o.createdAt))}.`)
        + itemsTable(o)
        + p(`<span style="font-size:13px;color:#76685A">Pago: ${esc(PAY_NAMES[o.payment] || o.payment)}${o.paymentDetail?.received ? ` · recibido ${clp(o.paymentDetail.received)} · vuelto ${clp(o.paymentDetail.change)}` : ""} · N° ${esc(o.id)}<br>Este correo es un comprobante de compra y no reemplaza a la boleta.</span>`)
        + btn(config.siteUrl, "Visita nuestra tienda online"),
    }),
  }),

  // Aviso al dueño: stock bajo.
  avisoStockBajo: products => ({
    to: config.mail.ownerTo,
    subject: `⚠️ Stock bajo: ${products.length} producto${products.length === 1 ? "" : "s"}`,
    html: layout({
      preheader: products.map(x => x.name).join(", "), title: "Productos por reponer",
      body: p("Estos productos quedaron con poco stock después de las últimas ventas:")
        + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${products.map(x => `<tr><td style="padding:7px 0;border-bottom:1px solid #EFE6DA;font-size:14px">${esc(x.name)}</td><td align="right" style="padding:7px 0;border-bottom:1px solid #EFE6DA;font-size:14px;font-weight:bold;color:${x.stock <= 0 ? "#C92E2E" : "#B86E00"}">${x.stock <= 0 ? "Agotado" : x.stock + " u."}</td></tr>`).join("")}</table>`
        + btn(`${config.siteUrl}/admin`, "Actualizar stock"),
    }),
  }),

  // Formulario de contacto → dueño.
  contactoDueno: f => ({
    to: config.mail.ownerTo, replyTo: f.email,
    subject: `✉️ Contacto web: ${f.name}`,
    html: layout({
      preheader: f.message.slice(0, 90), title: "Nuevo mensaje desde la web",
      body: box(`<b>${esc(f.name)}</b><br>${esc(f.email)}${f.phone ? " · " + esc(f.phone) : ""}`)
        + p(esc(f.message).replace(/\n/g, "<br>")) + p(`<span style="color:#76685A;font-size:13px">Responde directamente a este correo para contestarle.</span>`),
    }),
  }),

  // Copia al cliente que escribió.
  contactoCliente: f => ({
    to: f.email,
    subject: "Recibimos tu mensaje · Don Dog",
    html: layout({
      preheader: "Te respondemos a la brevedad.", title: `¡Hola ${f.name.split(" ")[0]}! Recibimos tu mensaje`,
      body: p("Gracias por escribirnos. Te respondemos dentro del día hábil.") + box(esc(f.message).replace(/\n/g, "<br>")) + btn(config.siteUrl, "Volver a la tienda"),
    }),
  }),
};

function textFromHtml(html) {
  return html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|tr|h1|div)>/g, "\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, "$2 ($1)").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
}

async function send(kind, data) {
  const t = templates[kind]?.(data);
  if (!t || !t.to) return { skipped: true };
  const msg = {
    from: config.mail.from, to: t.to, subject: t.subject, html: t.html, text: textFromHtml(t.html),
    replyTo: t.replyTo || config.mail.replyTo || undefined,
  };
  const log = (ok, err) => db.run("INSERT INTO mail_log(at, to_addr, subject, kind, ok, error) VALUES(?, ?, ?, ?, ?, ?)", [Date.now(), String(msg.to), msg.subject, kind, ok, err]).catch(() => {});
  try {
    if (transport) await transport.sendMail(msg);
    else {
      fs.mkdirSync(outbox, { recursive: true });
      const f = path.join(outbox, `${Date.now()}-${kind}.html`);
      fs.writeFileSync(f, `<!-- Para: ${msg.to} | Asunto: ${msg.subject} -->\n${msg.html}`);
      console.log(`[correo sin SMTP] ${kind} → ${msg.to}: ${msg.subject} (guardado en ${path.relative(config.root, f)})`);
    }
    await log(1, null);
    return { ok: true };
  } catch (e) {
    console.error(`[correo] Error enviando ${kind} a ${msg.to}:`, e.message);
    await log(0, e.message);
    return { ok: false, error: e.message };
  }
}

// Envía sin bloquear la respuesta HTTP.
const sendLater = (kind, data) => background(send(kind, data));

module.exports = { send, sendLater, templates, smtpReady, transport };
