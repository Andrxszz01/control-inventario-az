const db = require('./src/database/connection');

(async () => {
  await db.connect();
  const tables = await db.all("SELECT name FROM sqlite_master WHERE type = 'table'");
  const set = new Set(tables.map(t => t.name));

  const targets = ['detalle_ventas', 'abonos', 'ventas', 'gastos', 'caja', 'clientes'];

  await db.run('BEGIN TRANSACTION');
  try {
    await db.run('PRAGMA foreign_keys = OFF');

    for (const t of targets) {
      if (set.has(t)) {
        await db.run(`DELETE FROM ${t}`);
      }
    }

    if (set.has('productos')) {
      await db.run('UPDATE productos SET stock = 0');
    }

    if (set.has('sqlite_sequence')) {
      for (const t of targets) {
        await db.run('DELETE FROM sqlite_sequence WHERE name = ?', [t]);
      }
    }

    await db.run('PRAGMA foreign_keys = ON');
    await db.run('COMMIT');

    const result = {
      ventas: (await db.get('SELECT COUNT(*) c FROM ventas'))?.c || 0,
      detalle_ventas: (await db.get('SELECT COUNT(*) c FROM detalle_ventas'))?.c || 0,
      gastos: (await db.get('SELECT COUNT(*) c FROM gastos'))?.c || 0,
      caja: (await db.get('SELECT COUNT(*) c FROM caja'))?.c || 0,
      caja_abierta: (await db.get("SELECT COUNT(*) c FROM caja WHERE estado='abierta'"))?.c || 0,
      productos_stock_no_cero: (await db.get('SELECT COUNT(*) c FROM productos WHERE stock <> 0'))?.c || 0,
    };

    console.log(JSON.stringify(result));
  } catch (e) {
    try { await db.run('ROLLBACK'); } catch (_) {}
    throw e;
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
