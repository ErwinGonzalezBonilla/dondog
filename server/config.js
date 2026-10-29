// Configuración leída de variables de entorno (archivo .env en la raíz).
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

// Carga simple de .env sin dependencias: CLAVE=valor, ignora comentarios.
(function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
})();

const env = (k, d = "") => (process.env[k] ?? d).trim();
const bool = (k, d = false) => { const v = env(k); return v ? ["1", "true", "si", "sí", "yes"].includes(v.toLowerCase()) : d; };

// En Vercel solo /tmp es escribible (y temporal): la base de datos va en Turso y las fotos en Vercel Blob.
const serverless = !!process.env.VERCEL;
const DATA_DIR = path.resolve(ROOT, env("DATA_DIR", serverless ? "/tmp/dondog" : "server/data"));
fs.mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });

const config = {
  root: ROOT,
  serverless,
  dataDir: DATA_DIR,
  uploadsDir: path.join(DATA_DIR, "uploads"),
  port: parseInt(env("PORT", "3000"), 10),
  // En Vercel, si no se define SITE_URL, se usa el dominio de producción del proyecto (xxx.vercel.app).
  siteUrl: env("SITE_URL", process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "http://localhost:3000").replace(/\/+$/, ""),
  production: env("NODE_ENV") === "production",
  sessionSecret: env("SESSION_SECRET"),
  trustProxy: bool("TRUST_PROXY", true),

  store: {
    name: env("STORE_NAME", "Don Dog"),
    address: env("STORE_ADDRESS", "Candelaria Goyenechea 3820, local 165, Lo Castillo, Vitacura"),
    phone: env("STORE_PHONE", ""),
    instagram: env("STORE_INSTAGRAM", "dondog.cl"),
    hours: env("STORE_HOURS", "Lunes a sábado, 10:00 a 20:00"),
  },

  mail: {
    host: env("SMTP_HOST"),
    port: parseInt(env("SMTP_PORT", "465"), 10),
    secure: bool("SMTP_SECURE", env("SMTP_PORT", "465") === "465"),
    user: env("SMTP_USER"),
    pass: env("SMTP_PASS"),
    from: env("MAIL_FROM", "Don Dog <pedidos@dondog.cl>"),
    replyTo: env("MAIL_REPLY_TO", ""),
    // Correo(s) del dueño que reciben avisos de pedidos, stock bajo y contacto. Separados por coma.
    ownerTo: env("MAIL_OWNER_TO", ""),
  },

  webpay: {
    enabled: bool("WEBPAY_ENABLED", true),
    production: env("WEBPAY_ENV", "integration") === "production",
    commerceCode: env("WEBPAY_COMMERCE_CODE"),
    apiKey: env("WEBPAY_API_KEY"),
  },

  mercadopago: {
    enabled: bool("MP_ENABLED", false),
    accessToken: env("MP_ACCESS_TOKEN"),
    webhookSecret: env("MP_WEBHOOK_SECRET"),
  },

  transfer: {
    enabled: bool("TRANSFER_ENABLED", true),
    holder: env("TRANSFER_HOLDER", ""),
    rut: env("TRANSFER_RUT", ""),
    bank: env("TRANSFER_BANK", ""),
    accountType: env("TRANSFER_ACCOUNT_TYPE", ""),
    accountNumber: env("TRANSFER_ACCOUNT_NUMBER", ""),
    email: env("TRANSFER_EMAIL", ""),
    hoursToPay: parseInt(env("TRANSFER_HOURS_TO_PAY", "48"), 10),
  },

  ai: {
    apiKey: env("ANTHROPIC_API_KEY"),
    model: env("AI_MODEL", "claude-opus-5-5"),
  },

  sheetsWebhook: env("SHEETS_WEBHOOK_URL"),
  // Minutos que se reserva el stock mientras el cliente paga con Webpay / Mercado Pago.
  paymentHoldMinutes: parseInt(env("PAYMENT_HOLD_MINUTES", "30"), 10),
};

if (!config.sessionSecret) {
  if (config.production) {
    console.error("Falta SESSION_SECRET en .env. Genera uno con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
    process.exit(1);
  }
  config.sessionSecret = "dev-secret-cambiar";
}

module.exports = config;
