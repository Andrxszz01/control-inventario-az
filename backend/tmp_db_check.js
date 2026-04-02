const db = require('./src/database/connection');

(async () => {
  await db.connect();
  const one = async (sql, params = []) => db.get(sql, params);

  const ventas = await one('SELECT COUNT(*) AS c FROM ventas');
  const detalle = await one('SELECT COUNT(*) AS c FROM detalle_ventas');
  const gastos = await one('SELECT COUNT(*) AS c FROM gastos');
  const caja = await one('SELECT COUNT(*) AS c FROM caja');
  const abierta = await one("SELECT COUNT(*) AS c FROM caja WHERE estado = 'abierta'");
  const ultimaCaja = await one('SELECT id, estado, fecha_apertura, fecha_cierre FROM caja ORDER BY id DESC LIMIT 1');

  console.log(JSON.stringify({
    ventas: ventas?.c || 0,
    detalle_ventas: detalle?.c || 0,
    gastos: gastos?.c || 0,
    caja: caja?.c || 0,
    caja_abierta: abierta?.c || 0,
    ultima_caja: ultimaCaja || null,
  }));

  await db.close();
})().catch(async (e) => {
  console.error(e);
  try { await db.close(); } catch (_) {}
  process.exit(1);
});
