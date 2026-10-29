// Carga el catálogo de ejemplo (server/productos-ejemplo.json) si la tienda no tiene productos.
// Uso: npm run cargar-ejemplo            (solo si está vacía)
//      npm run cargar-ejemplo -- --forzar (agrega/actualiza aunque ya haya productos)
// Con TURSO_DATABASE_URL y TURSO_AUTH_TOKEN definidos, carga en la base de datos de Turso.
const fs = require("node:fs");
const path = require("node:path");
const { db } = require("../db");
const { saveProduct, getProduct } = require("../products");

(async () => {
  const force = process.argv.includes("--forzar");
  const count = Number((await db.get("SELECT COUNT(*) AS n FROM products")).n);
  if (count && !force) { console.log(`La tienda ya tiene ${count} productos. Usa --forzar para cargar igual.`); return; }
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "productos-ejemplo.json"), "utf8"));
  for (const p of list) await saveProduct({ ...p, image: p.image || p.imageUrl || "" }, (await getProduct(p.id)) ? p.id : undefined);
  console.log(`Listo: ${list.length} productos de ejemplo cargados.`);
})();
