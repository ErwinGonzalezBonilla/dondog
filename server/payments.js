// Integración de pagos: Webpay Plus (Transbank) y Mercado Pago Checkout Pro.
const config = require("./config");
const orders = require("./orders");

// ---------- Webpay Plus ----------
let webpayTx = null;
function webpay() {
  if (webpayTx) return webpayTx;
  const { WebpayPlus, IntegrationCommerceCodes, IntegrationApiKeys } = require("transbank-sdk");
  const w = config.webpay;
  if (w.production) {
    if (!w.commerceCode || !w.apiKey) throw new Error("Faltan WEBPAY_COMMERCE_CODE / WEBPAY_API_KEY para producción.");
    webpayTx = WebpayPlus.Transaction.buildForProduction(w.commerceCode, w.apiKey);
  } else {
    // Ambiente de integración (pruebas) con las credenciales públicas de Transbank.
    webpayTx = WebpayPlus.Transaction.buildForIntegration(w.commerceCode || IntegrationCommerceCodes.WEBPAY_PLUS, w.apiKey || IntegrationApiKeys.WEBPAY);
  }
  return webpayTx;
}

async function startWebpay(order) {
  const r = await webpay().create(order.id, order.id, order.total, `${config.siteUrl}/pago/webpay/retorno`);
  return { type: "form", url: r.url, fields: { token_ws: r.token } };
}

// Retorno desde Webpay. Transbank envía token_ws (flujo normal), TBK_TOKEN (pago anulado) o solo TBK_ORDEN_COMPRA (timeout).
async function handleWebpayReturn(params) {
  const token = params.token_ws, buyOrder = params.TBK_ORDEN_COMPRA;
  if (!token) {
    if (buyOrder) await orders.markFailed(String(buyOrder), "rechazado", { webpay: "anulado por el cliente o tiempo agotado" });
    return { orderId: buyOrder ? String(buyOrder) : null, ok: false };
  }
  let r;
  try { r = await webpay().commit(String(token)); }
  catch (e) {
    // commit falla si el token ya se confirmó (p. ej. recarga de página): consultar estado.
    try { r = await webpay().status(String(token)); } catch { console.error("[webpay] commit/status falló:", e.message); return { orderId: null, ok: false }; }
  }
  const orderId = r.buy_order;
  const o = await orders.getOrder(orderId);
  if (!o) return { orderId: null, ok: false };
  if (r.status === "AUTHORIZED" && r.response_code === 0 && Number(r.amount) === o.total) {
    await orders.markPaid(orderId, {
      ref: String(token),
      detail: {
        authorizationCode: r.authorization_code, cardLast4: r.card_detail?.card_number,
        paymentType: r.payment_type_code, installments: r.installments_number, transactionDate: r.transaction_date,
      },
    });
    return { orderId, ok: true };
  }
  await orders.markFailed(orderId, "rechazado", { webpay: r.status, responseCode: r.response_code });
  return { orderId, ok: false };
}

// ---------- Mercado Pago ----------
let mpClient = null;
function mp() {
  if (!mpClient) {
    const { MercadoPagoConfig } = require("mercadopago");
    mpClient = new MercadoPagoConfig({ accessToken: config.mercadopago.accessToken, options: { timeout: 15000 } });
  }
  return mpClient;
}

async function startMercadoPago(order) {
  const { Preference } = require("mercadopago");
  const items = order.items.map(i => ({ id: i.id, title: i.name.slice(0, 250), quantity: i.qty, unit_price: i.price, currency_id: "CLP" }));
  if (order.shipping) items.push({ id: "despacho", title: "Despacho a domicilio", quantity: 1, unit_price: order.shipping, currency_id: "CLP" });
  const https = config.siteUrl.startsWith("https://");
  const pref = await new Preference(mp()).create({
    body: {
      items,
      payer: { name: order.customer.name, email: order.customer.email },
      external_reference: order.id,
      back_urls: {
        success: `${config.siteUrl}/pago/mp/retorno`,
        failure: `${config.siteUrl}/pago/mp/retorno`,
        pending: `${config.siteUrl}/pago/mp/retorno`,
      },
      auto_return: https ? "approved" : undefined,
      notification_url: https ? `${config.siteUrl}/api/pagos/mp/webhook` : undefined,
      statement_descriptor: "DONDOG",
      expiration_date_to: new Date(order.holdUntil).toISOString(),
      expires: true,
    },
  });
  return { type: "redirect", url: pref.init_point };
}

// Consulta el pago en Mercado Pago (nunca confiamos en los parámetros del navegador) y actualiza el pedido.
async function syncMercadoPagoPayment(paymentId) {
  const { Payment } = require("mercadopago");
  const pay = await new Payment(mp()).get({ id: String(paymentId) });
  const orderId = pay.external_reference;
  const o = orderId && await orders.getOrder(orderId);
  if (!o) return { orderId: null, ok: false };
  if (pay.status === "approved" && Number(pay.transaction_amount) >= o.total && pay.currency_id === "CLP") {
    await orders.markPaid(orderId, {
      ref: String(pay.id),
      detail: { mpPaymentId: pay.id, cardLast4: pay.card?.last_four_digits, paymentType: pay.payment_type_id, installments: pay.installments },
    });
    return { orderId, ok: true };
  }
  return { orderId, ok: false, pending: ["pending", "in_process", "authorized"].includes(pay.status) };
}

function verifyMercadoPagoSignature(req, dataId) {
  if (!config.mercadopago.webhookSecret) return true;
  const { WebhookSignatureValidator } = require("mercadopago");
  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers["x-signature"], xRequestId: req.headers["x-request-id"], dataId, secret: config.mercadopago.webhookSecret,
    });
    return true;
  } catch { return false; }
}

async function startPayment(order) {
  if (order.payment === "webpay") return startWebpay(order);
  if (order.payment === "mercadopago") return startMercadoPago(order);
  return { type: "transfer" };
}

module.exports = { startPayment, handleWebpayReturn, syncMercadoPagoPayment, verifyMercadoPagoSignature };
