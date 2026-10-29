/**
 * Don Dog · recibir pedidos pagados en Google Sheets
 *
 * 1. Crea una hoja de cálculo nueva en Google Sheets.
 * 2. Menú Extensiones → Apps Script. Borra lo que haya y pega este código.
 * 3. Implementar → Nueva implementación → tipo "Aplicación web".
 *    Ejecutar como: tú. Quién tiene acceso: "Cualquier usuario".
 * 4. Copia la URL que termina en /exec y ponla en SHEETS_WEBHOOK_URL (variables de entorno).
 *
 * Cada artículo del pedido queda en una fila.
 */
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Pedidos")
    || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Pedidos");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Pedido", "Fecha", "Plazo", "Estado", "Cliente", "Teléfono", "Correo", "RUT", "Entrega",
      "Dirección", "Comuna", "Pago", "Producto", "Cantidad", "Precio unit.", "Total pedido"]);
    sheet.setFrozenRows(1);
  }
  data.items.forEach(function (i) {
    sheet.appendRow([data.pedido, new Date(data.fecha), new Date(data.plazo), data.estado, data.cliente, data.telefono,
      data.correo, data.rut, data.entrega, data.direccion, data.comuna, data.pago, i.producto, i.cantidad, i.precio, data.total]);
  });
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
