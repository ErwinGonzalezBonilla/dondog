// Catálogo: lectura y escritura de productos.
const crypto = require("node:crypto");
const { db, rowToProduct } = require("./db");

const CATEGORIES = ["alimentos", "snacks", "juguetes", "accesorios", "cosmetica", "salud", "ropa"];
const PETS = ["perro", "gato", "otros", "todos"];

function slugify(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "producto";
}
async function uniqueSlug(name, exceptId) {
  const base = slugify(name);
  let slug = base, n = 2;
  while (await db.get("SELECT 1 FROM products WHERE slug = ? AND id != ?", [slug, exceptId || ""])) slug = `${base}-${n++}`;
  return slug;
}

const listProducts = async ({ includeInactive = false } = {}) =>
  (await db.all(`SELECT * FROM products ${includeInactive ? "" : "WHERE active = 1"} ORDER BY featured DESC, name COLLATE NOCASE`)).map(rowToProduct);
const getProduct = async id => rowToProduct(await db.get("SELECT * FROM products WHERE id = ?", [String(id)]));
const getBySlug = async slug => rowToProduct(await db.get("SELECT * FROM products WHERE slug = ? AND active = 1", [String(slug)]));

function validate(b) {
  const str = (v, max) => String(v ?? "").trim().slice(0, max);
  const int = v => Math.max(0, Math.round(Number(v) || 0));
  const p = {
    name: str(b.name, 160), brand: str(b.brand, 80),
    category: CATEGORIES.includes(b.category) ? b.category : null,
    pet: PETS.includes(b.pet) ? b.pet : "perro",
    price: int(b.price), oldPrice: int(b.oldPrice), description: str(b.description, 3000),
    tags: (Array.isArray(b.tags) ? b.tags : String(b.tags || "").split(",")).map(t => str(t, 40)).filter(Boolean).slice(0, 15),
    image: str(b.image, 500), featured: !!b.featured, active: b.active !== false, stock: int(b.stock),
  };
  if (!p.name) throw Object.assign(new Error("El producto necesita nombre."), { status: 400 });
  if (!p.category) throw Object.assign(new Error("Categoría inválida."), { status: 400 });
  if (!(p.price > 0)) throw Object.assign(new Error("El precio debe ser mayor que 0."), { status: 400 });
  if (p.image && !/^(\/uploads\/[\w.-]+|https:\/\/\S+)$/.test(p.image)) throw Object.assign(new Error("La imagen debe ser una foto subida o una URL https."), { status: 400 });
  return p;
}

async function saveProduct(body, id) {
  const p = validate(body), now = Date.now();
  if (id) {
    if (!await getProduct(id)) throw Object.assign(new Error("Producto no encontrado."), { status: 404 });
    await db.run(`UPDATE products SET slug=?, name=?, brand=?, category=?, pet=?, price=?, old_price=?, description=?, tags=?, image=?,
      featured=?, active=?, stock=?, updated_at=? WHERE id=?`,
      [await uniqueSlug(p.name, id), p.name, p.brand, p.category, p.pet, p.price, p.oldPrice, p.description, JSON.stringify(p.tags), p.image,
        p.featured ? 1 : 0, p.active ? 1 : 0, p.stock, now, id]);
    return getProduct(id);
  }
  const newId = body.id && /^[\w-]{2,40}$/.test(body.id) && !await getProduct(body.id) ? body.id : "p" + crypto.randomBytes(5).toString("hex");
  await db.run(`INSERT INTO products(id, slug, name, brand, category, pet, price, old_price, description, tags, image, featured, active, stock, created_at, updated_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId, await uniqueSlug(p.name), p.name, p.brand, p.category, p.pet, p.price, p.oldPrice, p.description, JSON.stringify(p.tags), p.image,
      p.featured ? 1 : 0, p.active ? 1 : 0, p.stock, now, now]);
  return getProduct(newId);
}

async function setStock(id, qty) {
  const r = await db.run("UPDATE products SET stock = ?, updated_at = ? WHERE id = ?", [Math.max(0, Math.round(Number(qty) || 0)), Date.now(), String(id)]);
  if (!r.changes) throw Object.assign(new Error("Producto no encontrado."), { status: 404 });
  return getProduct(id);
}

async function deleteProduct(id) {
  if (!(await db.run("DELETE FROM products WHERE id = ?", [String(id)])).changes) throw Object.assign(new Error("Producto no encontrado."), { status: 404 });
}

// Datos públicos de un producto (sin campos internos).
const publicProduct = p => ({
  id: p.id, slug: p.slug, name: p.name, brand: p.brand, category: p.category, pet: p.pet, price: p.price, oldPrice: p.oldPrice,
  description: p.description, tags: p.tags, image: p.image, featured: p.featured, stock: p.stock,
});

module.exports = { CATEGORIES, PETS, listProducts, getProduct, getBySlug, saveProduct, setStock, deleteProduct, publicProduct, slugify };
