// Tareas que siguen después de responder (correos, Google Sheets).
// En Vercel la función se congela al responder, así que se registran con waitUntil.
const config = require("./config");

let waitUntil = null;
if (config.serverless) { try { ({ waitUntil } = require("@vercel/functions")); } catch {} }

function background(promise) {
  const p = Promise.resolve(promise).catch(e => console.error("[tarea en segundo plano]", e?.message || e));
  if (waitUntil) waitUntil(p);
  return p;
}

module.exports = { background };
