# Don Dog · Tienda online

Ecommerce del pet shop **Don Dog** (Candelaria Goyenechea 3820, local 165, Lo Castillo, Vitacura).

## Qué incluye

- Portada con foto de la tienda, categorías, destacados, ofertas, “Nosotros” y asesor **El Don**.
- Menú agrupado: Perros, Gatos, Alimentación, Accesorios y juguetes, Cuidado y salud, Ofertas.
- Catálogo con buscador, filtros por categoría y mascota, y orden por precio o stock.
- Ficha de producto, carrito y checkout (despacho o retiro, Webpay / Mercado Pago / transferencia).
- Stock visible por producto (disponible, últimas unidades, agotado).
- Panel del dueño: pedidos con cuenta regresiva de 24 h, productos, stock y ajustes.

## Cómo verlo

Abre `index.html` en el navegador. Sin servidor la tienda funciona en **modo demo**:
usa el catálogo de `js/demo-data.js`, guarda el carrito y los pedidos en el navegador y no cobra.

## Estructura

```
index.html            Página principal
css/styles.css        Estilos (paleta sacada de la tienda física)
js/app.js             Lógica: catálogo, carrito, checkout, panel admin, asesor IA
js/demo-data.js       Catálogo de ejemplo para el modo demo
data/productos-ejemplo.json  Mismo catálogo en JSON
img/                  Logo, fotos de la tienda y mascota El Don
```

## Pendiente para salir a producción

1. **Base de datos y login del dueño** (Firebase o Supabase) para productos, stock y pedidos.
2. **Pago real**: Webpay Plus (Transbank) o Mercado Pago Checkout Pro, con las llaves en el servidor.
3. **Google Sheets**: enviar cada pedido a una hoja con un Apps Script (Web App) o desde el backend.
4. **IA**: el asesor y el autocompletado de fichas necesitan una API de IA llamada desde el servidor.
5. **SEO**: dominio propio, `sitemap.xml`, datos estructurados de producto y alta en Google Search Console.
